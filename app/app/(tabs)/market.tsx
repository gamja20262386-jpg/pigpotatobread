// 동문시장: 편집형 머리 → basalt 자동화 카드 → 라벨 필터 → 가게 2열 그리드
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Screen } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { StoreCard } from '../../src/components/StoreCard';
import { Txt } from '../../src/components/Txt';
import { useMarket } from '../../src/hooks';
import { useAgent } from '../../src/store/agent';
import { useSession } from '../../src/store/session';
import type { Market } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, radius, space, won } from '../../src/theme';

export default function MarketScreen() {
  const demoTime = useSession((s) => s.demoTime);
  const market = useMarket();
  const stores = useResource(`market-stores:${demoTime}`, () => api.stores({ kind: 'market' }));
  const [label, setLabel] = useState<string | null>(null);
  const send = useAgent((s) => s.send);
  const busy = useAgent((s) => s.busy);

  const all = stores.data?.stores ?? [];
  const labels = [...new Set(all.map((s) => s.label))];
  const shown = all.filter((s) => !label || s.label === label);
  const openCount = all.filter((s) => s.is_open).length;

  return (
    <Screen
      tab
      onRefresh={() => {
        void market.reload();
        void stores.reload();
      }}
    >
      <View style={{ gap: space.s, paddingTop: space.s }}>
        <Txt v="label" color={C.sub}>
          JEJU · DONGMUN MARKET
        </Txt>
        <Txt v="display">시장 가게를 한 번에 묶어 보내요</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.xs }}>
          {market.data ? (
            <>
              <Chip label={`영업 ${market.data.hours.open}–${market.data.hours.close}`} tone="leaf" />
              {market.data.hours.night_market ? <Chip label={`야시장 ${market.data.hours.night_market.replace('-', '–')}`} tone="brand" /> : null}
            </>
          ) : null}
          {stores.data ? <Chip label={`지금 연 가게 ${openCount}/${all.length}`} /> : null}
        </View>
      </View>

      <AutomationCard market={market.data} busy={busy} onDelegate={() => {
        void send('동문시장 가게들로 2명 저녁거리 3만원 이하');
        router.navigate('/agent');
      }} />

      {stores.error && !stores.data ? <ErrorView message={stores.error} onRetry={stores.reload} /> : null}
      {stores.loading && !stores.data ? <Loading label="시장 가게를 불러오는 중이에요" /> : null}

      {stores.data ? (
        <View style={{ gap: space.l }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: 6 }}>
            <Chip label="전체" pill active={!label} onPress={() => setLabel(null)} />
            {labels.map((l) => (
              <Chip key={l} label={l} pill active={label === l} onPress={() => setLabel(label === l ? null : l)} />
            ))}
          </ScrollView>
          {shown.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.xl }}>
              {shown.map((s) => (
                <StoreCard key={s.id} store={s} width="48%" />
              ))}
            </View>
          ) : (
            <Empty title="이 라벨 가게가 없어요" />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function AutomationCard({ market, busy, onDelegate }: { market?: Market; busy: boolean; onDelegate: () => void }) {
  const fee = market?.bundle_fee;
  const step = (n: string, title: string, body: string) => (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.basaltLine, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="captionMedium" color={C.white}>
          {n}
        </Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="bodyMedium" color={C.white} style={{ fontSize: 15, lineHeight: 22 }}>
          {title}
        </Txt>
        <Txt v="caption" color={C.basaltSub}>
          {body}
        </Txt>
      </View>
    </View>
  );
  return (
    <View style={{ backgroundColor: C.basalt, borderRadius: radius.sheet, padding: space.xl, gap: space.l }}>
      <View style={{ gap: 4 }}>
        <Txt v="label" color={C.brand}>
          HARUBANG AUTOMATION
        </Txt>
        <Txt v="serifTitle" color={C.white}>
          장 보는 동안, 하르방이 맡을게요
        </Txt>
      </View>
      <View style={{ gap: space.m }}>
        {step('1', '여러 가게에서 골라 담기', '회·떡·귤·막걸리, 가게가 달라도 괜찮아요')}
        {step('2', market ? market.hub.name : '공동 집하장', '가게마다 따로 오지 않고 한곳에서 봉투를 나눠 포장해요')}
        {step('3', '한 번에 배달', '냉장·따뜻한·상온 봉투로 나눠 함께 출발해요')}
      </View>
      <View style={{ backgroundColor: C.basaltLine, borderRadius: radius.card, padding: space.m, gap: 2 }}>
        <Txt v="captionMedium" color={C.white}>
          묶음 배송비 규칙
        </Txt>
        <Txt v="caption" color={C.basaltSub}>
          {fee
            ? `시장 가게 1곳 ${won(fee.base)}, 1곳 늘 때마다 +${won(fee.per_extra_stall)}, 최대 ${won(fee.max)}`
            : '시장 가게가 늘어도 배송비는 한 번만 받고, 가게 수에 따라 조금씩만 더해요(상한 있음)'}
        </Txt>
      </View>
      <Button label="하르방에게 맡기기" onPress={onDelegate} disabled={busy} />
    </View>
  );
}

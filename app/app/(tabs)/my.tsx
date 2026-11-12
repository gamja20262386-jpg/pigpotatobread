// 마이: 시연 로그인, 프로필, 좋아하는 것, 기본 배송지, 에이전트 팀, 상인 모드, LLM 상태, 시연 시각
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { api, API_URL, errorText } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { DemoLogin } from '../../src/components/DemoLogin';
import { Icon, type IconName } from '../../src/components/Icon';
import { LlmChip } from '../../src/components/LlmChip';
import { Card, Screen } from '../../src/components/Screen';
import { ErrorView, Loading } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import { cached, useResource } from '../../src/useResource';
import { color as C, radius, space } from '../../src/theme';

const DEMO_TIMES = ['08:30', '12:00', '18:30', '20:40', '23:00'];

export default function MyScreen() {
  const { token, user, logout, setUser, demoTime, setDemoTime, setDestination } = useSession();
  const { id: destId, list, market } = useDestination();
  const tags = useResource('tags', () => cached('products', api.products).then((r) => [...new Set(r.products.flatMap((p) => p.tags))]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const likes = user?.prefs?.likes ?? [];

  const savePrefs = async (prefs: { likes?: string[]; destination_id?: string }) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const r = await api.setPrefs(prefs);
      setUser(r.user);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  const toggleLike = (t: string) => void savePrefs({ likes: likes.includes(t) ? likes.filter((x) => x !== t) : [...likes, t] });
  const pickDest = (id: string) => {
    setDestination(id);
    void savePrefs({ destination_id: id });
  };

  return (
    <Screen tab>
      <View style={{ gap: space.s, paddingTop: space.s }}>
        <Txt v="label" color={C.sub}>
          MY JEJU EAT
        </Txt>
        <Txt v="display">{user ? `${user.name}님, 반가워요` : '시연 계정으로 둘러보세요'}</Txt>
      </View>

      {user ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={user.role === 'merchant' ? 'store' : 'user'} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{user.name}</Txt>
              <Txt v="caption" color={C.sub}>
                {user.email}
              </Txt>
            </View>
            <Chip small label={user.role === 'merchant' ? '상인' : '고객'} tone={user.role === 'merchant' ? 'sea' : 'brand'} />
          </View>
          <Button label="로그아웃" kind="outline" small onPress={logout} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card>
          <Txt v="bodyMedium">시연 로그인</Txt>
          <Txt v="caption" color={C.sub}>
            고객은 주문·개인화를, 상인은 동문 바당횟집 가게 관리를 해 볼 수 있어요.
          </Txt>
          <DemoLogin />
        </Card>
      )}

      <Section title="좋아하는 것" hint={token ? '하르방이 고를 때 먼저 봐요' : '로그인하면 저장돼요'}>
        {tags.loading && !tags.data ? <Loading /> : null}
        {tags.error && !tags.data ? <ErrorView compact message={tags.error} onRetry={tags.reload} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, opacity: saving ? 0.6 : 1 }}>
          {(tags.data ?? []).map((t) => (
            <Chip key={t} label={t} pill active={likes.includes(t)} onPress={token ? () => toggleLike(t) : undefined} />
          ))}
        </View>
        {error ? (
          <Txt v="caption" color={C.danger}>
            {error}
          </Txt>
        ) : null}
      </Section>

      <Section title="기본 배송지">
        {market.error && !market.data ? <ErrorView compact message={market.error} onRetry={market.reload} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {list.map((d) => (
            <Chip key={d.id} label={d.name} pill active={d.id === destId} onPress={() => pickDest(d.id)} />
          ))}
        </View>
      </Section>

      <View style={{ gap: space.s }}>
        <LinkRow icon="team" title="에이전트 팀 보기" body="하르방 팀 에이전트의 역할과 규칙" onPress={() => router.push('/team')} />
        {user?.role === 'merchant' ? <LinkRow icon="store" title="상인 모드" body="말로 재고·가격 고치기, 들어온 주문" onPress={() => router.push('/merchant')} /> : null}
      </View>

      <Section title="AI 상태">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <LlmChip />
          <Txt v="caption" color={C.sub} style={{ flex: 1 }} numberOfLines={1}>
            {API_URL}
          </Txt>
        </View>
        <Txt v="caption" color={C.sub}>
          AI가 꺼져 있어도 규칙과 템플릿으로 끝까지 동작해요. 가격·재고·배달비는 언제나 코드가 계산해요.
        </Txt>
      </Section>

      <Section title="시연 시각" hint="영업시간·마감 임박·식사 시간 판단에 써요">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="실제 시각" pill active={!demoTime} onPress={() => setDemoTime(null)} />
          {DEMO_TIMES.map((t) => (
            <Chip key={t} label={t} pill active={demoTime === t} onPress={() => setDemoTime(t)} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.m }}>
      <View>
        <Txt v="title">{title}</Txt>
        {hint ? (
          <Txt v="caption" color={C.sub}>
            {hint}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function LinkRow({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: C.basalt, borderRadius: radius.card, padding: space.l, opacity: pressed ? 0.85 : 1 })}
    >
      <Icon name={icon} color={C.brand} />
      <View style={{ flex: 1 }}>
        <Txt v="bodyMedium" color={C.white}>
          {title}
        </Txt>
        <Txt v="caption" color={C.basaltSub}>
          {body}
        </Txt>
      </View>
      <Icon name="right" size={18} color={C.basaltSub} />
    </Pressable>
  );
}

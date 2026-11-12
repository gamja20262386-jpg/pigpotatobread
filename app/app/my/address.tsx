// 마이 → 배송지 관리. 고르면 바로 쓰고, 로그인했으면 기본 배송지로도 저장한다.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api, errorText } from '../../src/api';
import { Icon } from '../../src/components/Icon';
import { Screen, StackHeader } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import { color as C, radius, space } from '../../src/theme';

export default function AddressScreen() {
  const { id, list, market } = useDestination();
  const token = useSession((s) => s.token);
  const setDestination = useSession((s) => s.setDestination);
  const setUser = useSession((s) => s.setUser);
  const [error, setError] = useState('');

  const pick = (destId: string) => {
    setDestination(destId);
    setError('');
    if (token)
      void api
        .setPrefs({ destination_id: destId })
        .then((r) => setUser(r.user))
        .catch((e: unknown) => setError(errorText(e)));
  };

  return (
    <Screen header={<StackHeader title="배송지 관리" />} onRefresh={market.reload}>
      <View style={{ gap: 4 }}>
        <Txt v="serifTitle">어디로 보낼까요</Txt>
        <Txt v="caption" color={C.sub}>
          {token ? '고른 곳이 기본 배송지로 저장돼요' : '로그인하면 기본 배송지로 저장돼요'}
        </Txt>
      </View>
      {market.loading && !market.data ? <Loading /> : null}
      {market.error && !market.data ? <ErrorView message={market.error} onRetry={market.reload} /> : null}
      {market.data && list.length === 0 ? <Empty title="고를 수 있는 배송지가 없어요" /> : null}
      <View style={{ gap: space.s }}>
        {list.map((d) => {
          const on = d.id === id;
          return (
            <Pressable
              key={d.id}
              onPress={() => pick(d.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, minHeight: 56, borderRadius: radius.card, borderWidth: 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.card }}
            >
              <Icon name="pin" size={20} color={on ? C.brand : C.sub} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium">{d.name}</Txt>
                {d.aliases?.length ? (
                  <Txt v="caption" color={C.sub}>
                    {d.aliases.join(' · ')}
                  </Txt>
                ) : null}
              </View>
              {on ? <Icon name="check" size={18} color={C.brand} /> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Txt v="caption" color={C.danger}>
          {error}
        </Txt>
      ) : null}
      {market.data ? (
        <Txt v="caption" color={C.sub}>
          {`시장 상품은 ${market.data.hub.name}에서 한 번에 출발해요`}
        </Txt>
      ) : null}
    </Screen>
  );
}

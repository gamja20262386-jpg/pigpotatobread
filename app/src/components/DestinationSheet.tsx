// 배송지 시트 (GET /market destinations). 로그인했으면 기본 배송지로도 저장한다.
import { Pressable, View } from 'react-native';
import { api } from '../api';
import { useDestination } from '../hooks';
import { useSession } from '../store/session';
import { color as C, radius, space } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ErrorView, Loading } from './States';
import { Txt } from './Txt';

export function DestinationSheet({ visible, onClose, onPicked }: { visible: boolean; onClose: () => void; onPicked?: (id: string) => void }) {
  const { id, list, market } = useDestination();
  const setDestination = useSession((s) => s.setDestination);
  const token = useSession((s) => s.token);
  const setUser = useSession((s) => s.setUser);
  const pick = (destId: string) => {
    setDestination(destId);
    if (token) void api.setPrefs({ destination_id: destId }).then((r) => setUser(r.user)).catch(() => undefined);
    onPicked?.(destId);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="어디로 보낼까요">
      {market.loading && !market.data ? <Loading /> : null}
      {market.error && !market.data ? <ErrorView compact message={market.error} onRetry={market.reload} /> : null}
      {list.map((d) => {
        const on = d.id === id;
        return (
          <Pressable
            key={d.id}
            onPress={() => pick(d.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, minHeight: 52, borderRadius: radius.card, borderWidth: 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.card }}
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
      {market.data ? (
        <Txt v="caption" color={C.sub}>
          {`시장 상품은 ${market.data.hub.name}에서 한 번에 출발해요`}
        </Txt>
      ) : null}
    </Sheet>
  );
}

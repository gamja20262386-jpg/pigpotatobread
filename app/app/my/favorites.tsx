// 마이 → 찜한 가게(기기에 저장). 가게 상세의 하트로 넣고 뺀다.
import { router } from 'expo-router';
import { View } from 'react-native';
import { api } from '../../src/api';
import { Screen, StackHeader } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { StoreRow } from '../../src/components/StoreCard';
import { useDestination } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import { useResource } from '../../src/useResource';

export default function FavoritesScreen() {
  const favorites = useSession((s) => s.favorites);
  const demoTime = useSession((s) => s.demoTime);
  const { id: destId } = useDestination();
  const stores = useResource(favorites.length ? `fav-stores:${demoTime}:${destId}` : null, () => api.stores({ destination_id: destId }));
  const list = favorites.map((id) => stores.data?.stores.find((s) => s.id === id)).filter((s) => !!s);

  return (
    <Screen header={<StackHeader title="찜한 가게" />} onRefresh={favorites.length ? stores.reload : undefined}>
      {!favorites.length ? (
        <Empty title="아직 찜한 가게가 없어요" body="가게 화면 위쪽 하트를 누르면 여기 모여요" action={{ label: '맛집 둘러보기', onPress: () => router.navigate('/') }} />
      ) : stores.error && !stores.data ? (
        <ErrorView message={stores.error} onRetry={stores.reload} />
      ) : stores.loading && !stores.data ? (
        <Loading />
      ) : list.length ? (
        <View>
          {list.map((s, i) => (
            <StoreRow key={s.id} store={s} last={i === list.length - 1} />
          ))}
        </View>
      ) : (
        <Empty title="찜한 가게를 찾지 못했어요" body="가게 정보가 바뀌었을 수 있어요" />
      )}
    </Screen>
  );
}

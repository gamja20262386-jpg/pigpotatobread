// 마이 → 내 취향(좋아하는 것). 하르방이 고를 때 먼저 본다. 로그인해야 저장된다.
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorText } from '../../src/api';
import { Chip } from '../../src/components/Chip';
import { DemoLogin } from '../../src/components/DemoLogin';
import { Card, Screen, StackHeader } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useProductIndex } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import { color as C } from '../../src/theme';

export default function LikesScreen() {
  const token = useSession((s) => s.token);
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const products = useProductIndex();
  const tags = [...new Set((products.data ?? []).flatMap((p) => p.tags))];
  const likes = user?.prefs?.likes ?? [];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = async (t: string) => {
    setSaving(true);
    setError('');
    try {
      const r = await api.setPrefs({ likes: likes.includes(t) ? likes.filter((x) => x !== t) : [...likes, t] });
      setUser(r.user);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<StackHeader title="내 취향" />} onRefresh={products.reload}>
      <View style={{ gap: 4 }}>
        <Txt v="serifTitle">좋아하는 것을 골라 주세요</Txt>
        <Txt v="caption" color={C.sub}>
          하르방이 장바구니를 짤 때 먼저 봐요. {likes.length ? `지금 ${likes.length}개 골랐어요.` : ''}
        </Txt>
      </View>
      {!token ? (
        <Card>
          <Txt v="bodyMedium">로그인하면 취향이 저장돼요</Txt>
          <DemoLogin only="customer" />
        </Card>
      ) : null}
      {products.loading && !products.data ? <Loading /> : null}
      {products.error && !products.data ? <ErrorView message={products.error} onRetry={products.reload} /> : null}
      {products.data && tags.length === 0 ? <Empty title="고를 수 있는 취향이 아직 없어요" /> : null}
      {tags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, opacity: saving ? 0.6 : token ? 1 : 0.5 }}>
          {tags.map((t) => (
            <Chip key={t} label={t} pill tone="outline" active={likes.includes(t)} onPress={token && !saving ? () => void toggle(t) : undefined} />
          ))}
        </View>
      ) : null}
      {error ? (
        <Txt v="caption" color={C.danger}>
          {error}
        </Txt>
      ) : null}
    </Screen>
  );
}

// 시연 로그인 버튼(고객/상인) — POST /auth/demo
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorText } from '../api';
import { useSession } from '../store/session';
import { color as C, space } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

export function DemoLogin({ onDone, only }: { onDone?: () => void; only?: 'customer' | 'merchant' }) {
  const setAuth = useSession((s) => s.setAuth);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const login = async (role: 'customer' | 'merchant') => {
    setBusy(role);
    setError('');
    try {
      const r = await api.demoLogin(role);
      setAuth(r.token, r.user);
      onDone?.();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', gap: space.s }}>
        {only !== 'merchant' ? <Button label="고객으로 시연" onPress={() => void login('customer')} busy={busy === 'customer'} disabled={!!busy} style={{ flex: 1 }} /> : null}
        {only !== 'customer' ? (
          <Button label="상인으로 시연" kind={only === 'merchant' ? 'primary' : 'outline'} onPress={() => void login('merchant')} busy={busy === 'merchant'} disabled={!!busy} style={{ flex: 1 }} />
        ) : null}
      </View>
      {error ? (
        <Txt v="caption" color={C.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

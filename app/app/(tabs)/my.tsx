// 마이(v0.2 H·N): 제주잇 워드마크 → 머리 카드(로그인/프로필) → 빠른 메뉴 3칸 → 목록 행(현재 값 회색, 세부 화면으로)
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Chip } from '../../src/components/Chip';
import { DemoLogin } from '../../src/components/DemoLogin';
import { Icon, type IconName } from '../../src/components/Icon';
import { Card, Screen } from '../../src/components/Screen';
import { Txt } from '../../src/components/Txt';
import { shortModel, useDestination, useHealth } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import { color as C, font, radius, space } from '../../src/theme';

export default function MyScreen() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const demoTime = useSession((s) => s.demoTime);
  const favorites = useSession((s) => s.favorites);
  const { current } = useDestination();
  const health = useHealth();
  const likes = user?.prefs?.likes ?? [];
  const llm = health.data?.llm;
  const aiValue = health.error ? '연결 안 됨' : !llm ? '확인 중' : llm.available ? `${llm.provider === 'ollama' ? '로컬 AI' : 'AI'} · ${shortModel(llm.model)}` : '규칙 모드';

  return (
    <Screen tab>
      <Txt v="display" color={C.brand} style={{ fontSize: 26, paddingTop: space.s }}>
        제주잇
      </Txt>

      {user ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={user.role === 'merchant' ? 'store' : 'user'} color={C.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Txt v="bodyMedium" style={{ fontFamily: font.bold, fontSize: 17, flexShrink: 1 }} numberOfLines={1}>
                  {`${user.name}님`}
                </Txt>
                <Chip small label={user.role === 'merchant' ? '상인' : '고객'} tone={user.role === 'merchant' ? 'sea' : 'brand'} />
              </View>
              <Txt v="caption" color={C.sub} numberOfLines={1}>
                {user.email}
              </Txt>
            </View>
            <Pressable onPress={logout} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: space.s }}>
              <Txt v="caption" color={C.sub}>
                로그아웃
              </Txt>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card>
          <Txt v="bodyMedium" style={{ fontFamily: font.bold }}>
            시연 계정으로 둘러보세요
          </Txt>
          <Txt v="caption" color={C.sub}>
            고객은 주문, 상인은 가게 관리
          </Txt>
          <DemoLogin />
        </Card>
      )}

      {/* 빠른 메뉴 3칸 */}
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, paddingVertical: space.l }}>
        <Quick icon="receipt" label="주문내역" onPress={() => router.navigate('/orders')} />
        <Quick icon="heart" label={`찜한 가게${favorites.length ? ` ${favorites.length}` : ''}`} onPress={() => router.push('/my/favorites')} />
        <Quick icon="pin" label="배송지" onPress={() => router.push('/my/address')} />
      </View>

      {/* 목록 행 */}
      <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
        <Row icon="spark" title="좋아하는 것" value={likes.length ? (likes.length > 2 ? `${likes.slice(0, 2).join(', ')} 외 ${likes.length - 2}` : likes.join(', ')) : user ? '아직 없음' : '로그인 필요'} onPress={() => router.push('/my/likes')} />
        <Row icon="pin" title="기본 배송지" value={current?.name} onPress={() => router.push('/my/address')} />
        <Row icon="team" title="에이전트 팀" onPress={() => router.push('/team')} />
        {user?.role === 'merchant' ? <Row icon="store" title="상인 모드" value="재고·주문" onPress={() => router.push('/merchant')} /> : null}
        <Row icon="info" title="AI 상태" value={aiValue} onPress={() => router.push('/my/demo')} />
        <Row icon="clock" title="시연 시각" value={demoTime ?? '실제 시각'} onPress={() => router.push('/my/demo')} last />
      </View>
    </Screen>
  );
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={26} color={C.ink} />
      <Txt v="captionMedium" numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Row({ icon, title, value, onPress, last }: { icon: IconName; title: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.m,
        minHeight: 52,
        paddingHorizontal: space.l,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
        backgroundColor: pressed ? C.bg : C.card,
      })}
    >
      <Icon name={icon} size={20} color={C.sub} />
      <Txt v="bodyMedium" style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
        {title}
      </Txt>
      {value ? (
        <Txt v="caption" color={C.sub} numberOfLines={1} style={{ maxWidth: 140 }}>
          {value}
        </Txt>
      ) : null}
      <Icon name="right" size={16} color={C.sub} />
    </Pressable>
  );
}

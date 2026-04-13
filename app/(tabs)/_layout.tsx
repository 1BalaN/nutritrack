import { Platform } from 'react-native'
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Colors } from '@/constants'

/** iOS: без «плавающей» капсулы — таббар на всю ширину, не схлопывается при скролле */
const IOS_TAB_BAR_PROPS =
  Platform.OS === 'ios'
    ? ({
        minimizeBehavior: 'never' as const,
        disableTransparentOnScrollEdge: true,
      } as const)
    : {}

const isIOS = Platform.OS === 'ios'

export default function TabsLayout() {
  return (
    <NativeTabs
      // iOS: avoid green "capsule" + white icon combo; keep selected icon/label green.
      tintColor={isIOS ? undefined : Colors.primary}
      backgroundColor={Colors.surface}
      labelStyle={{
        default: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary },
        selected: { fontSize: 10, fontWeight: '600', color: Colors.primary },
      }}
      iconColor={{ default: Colors.textTertiary, selected: isIOS ? Colors.primary : Colors.white }}
      indicatorColor={Colors.primary}
      {...IOS_TAB_BAR_PROPS}
    >
      <NativeTabs.Trigger name='index'>
        <Label>Дневник</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name='silverware-fork-knife' />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='analytics'>
        <Label>Аналитика</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name='chart-line' />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='profile'>
        <Label>Профиль</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name='account-circle' />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUserProfileQuery, useUpdateProfileMutation } from '@/hooks/useUserProfileQuery'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import { calcTDEE } from '@/lib/nutrition'
import type { ActivityLevel, Sex } from '@/types'

const ANDROID_TABBAR_OVERLAY_GAP = 72

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Сидячий', desc: 'Минимум движения' },
  { value: 'light', label: 'Лёгкий', desc: '1-3 тренировки/нед' },
  { value: 'moderate', label: 'Умеренный', desc: '3-5 тренировок/нед' },
  { value: 'active', label: 'Активный', desc: '6-7 тренировок/нед' },
  { value: 'very_active', label: 'Очень активный', desc: 'Физ. работа + тренировки' },
]

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function ProfileField({
  label,
  value,
  onChange,
  suffix,
  keyboardType = 'numeric',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  keyboardType?: 'numeric' | 'default'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          selectTextOnFocus
          placeholder='—'
          placeholderTextColor={Colors.textTertiary}
        />
        {suffix ? <Text style={styles.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { data: profile, isLoading } = useUserProfileQuery()
  const updateMutation = useUpdateProfileMutation()

  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary')
  const [calorieGoal, setCalorieGoal] = useState<string>('')

  const [initialized, setInitialized] = useState(false)

  const normalizeDecimal = (v: string): string => {
    return v.replace(',', '.')
  }

  const parseDecimalOrNull = (v: string): number | null => {
    const n = parseFloat(normalizeDecimal(v))
    return Number.isFinite(n) ? n : null
  }

  const weightNum = parseDecimalOrNull(weight)
  const heightNum = parseDecimalOrNull(height)
  const ageNum = useMemo(() => {
    const n = parseInt(age, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [age])

  const recommendedCalories = useMemo(() => {
    if (!weightNum || !heightNum || !ageNum || !sex) return null
    return calcTDEE(weightNum, heightNum, ageNum, sex, activityLevel)
  }, [weightNum, heightNum, ageNum, sex, activityLevel])

  if (profile && !initialized) {
    setWeight(profile.weight ? String(profile.weight) : '')
    setHeight(profile.height ? String(profile.height) : '')
    setAge(profile.age ? String(profile.age) : '')
    setSex(profile.sex)
    setActivityLevel(profile.activityLevel)
    setCalorieGoal(profile.calorieGoal ? String(profile.calorieGoal) : '2000')
    setInitialized(true)
  }

  const handleSave = () => {
    updateMutation.mutate(
      {
        weight: parseDecimalOrNull(weight),
        height: parseDecimalOrNull(height),
        age: parseInt(age, 10) || null,
        sex,
        activityLevel,
        calorieGoal: parseInt(calorieGoal, 10) || recommendedCalories || 2000,
      },
      {
        onSuccess: () => Alert.alert('Сохранено', 'Профиль обновлён'),
        onError: () => Alert.alert('Ошибка', 'Не удалось сохранить профиль'),
      }
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Профиль</Text>
        <Pressable
          onPress={handleSave}
          disabled={updateMutation.isPending}
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.saveButtonText}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'android' ? ANDROID_TABBAR_OVERLAY_GAP : 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title='Личные данные' />
        <View style={styles.card}>
          <View style={styles.fieldsRow}>
            <ProfileField
              label='Вес'
              value={weight}
              onChange={(v) => setWeight(normalizeDecimal(v))}
              suffix='кг'
            />
            <ProfileField
              label='Рост'
              value={height}
              onChange={(v) => setHeight(normalizeDecimal(v))}
              suffix='см'
            />
            <ProfileField label='Возраст' value={age} onChange={setAge} suffix='лет' />
          </View>

          <View style={styles.separator} />

          <Text style={styles.fieldLabel}>Пол</Text>
          <View style={styles.sexRow}>
            {(['male', 'female'] as Sex[]).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSex(s)}
                style={[styles.sexOption, sex === s && styles.sexOptionActive]}
              >
                <Text style={styles.sexEmoji}>{s === 'male' ? '♂️' : '♀️'}</Text>
                <Text style={[styles.sexLabel, sex === s && styles.sexLabelActive]}>
                  {s === 'male' ? 'Мужской' : 'Женский'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionHeader title='Уровень активности' />
        <View style={styles.card}>
          {ACTIVITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setActivityLevel(opt.value)}
              style={[
                styles.activityOption,
                activityLevel === opt.value && styles.activityOptionActive,
              ]}
            >
              <View style={styles.activityCheck}>
                {activityLevel === opt.value ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={styles.activityText}>
                <Text
                  style={[
                    styles.activityLabel,
                    activityLevel === opt.value && styles.activityLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.activityDesc}>{opt.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <SectionHeader title='Цель по калориям' />
        <View style={styles.card}>
          <View style={styles.goalRow}>
            <View style={styles.goalInputWrap}>
              <TextInput
                style={styles.goalInput}
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType='numeric'
                selectTextOnFocus
                placeholder='2000'
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={styles.goalSuffix}>ккал / день</Text>
            </View>
            {recommendedCalories ? (
              <View style={styles.tdeeHint}>
                <Text style={styles.tdeeHintText}>Рекомендуется ~{recommendedCalories} ккал</Text>
                <Text style={styles.tdeeSubText}>(по данным профиля)</Text>
                <Pressable
                  onPress={() => setCalorieGoal(String(recommendedCalories))}
                  style={styles.applyTdeeBtn}
                  accessibilityRole='button'
                  accessibilityLabel='Применить рекомендованную цель по калориям'
                >
                  <Text style={styles.applyTdeeBtnText}>Применить</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.body, color: Colors.textSecondary },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: { ...Typography.h2 },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  saveButtonText: { ...Typography.body, color: Colors.white, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  sectionHeader: {
    ...Typography.label,
    color: Colors.textSecondary,
    paddingTop: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  fieldsRow: { flexDirection: 'row', gap: Spacing.md },
  field: { flex: 1 },
  fieldLabel: { ...Typography.caption, marginBottom: Spacing.xs },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  fieldInput: {
    flex: 1,
    height: 40,
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  fieldSuffix: { ...Typography.caption, color: Colors.textTertiary },
  separator: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  sexRow: { flexDirection: 'row', gap: Spacing.md },
  sexOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sexOptionActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  sexEmoji: { fontSize: 20 },
  sexLabel: { ...Typography.body, fontWeight: '500' },
  sexLabelActive: { color: Colors.primaryDark, fontWeight: '600' },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
  },
  activityOptionActive: { backgroundColor: Colors.primarySurface },
  activityCheck: {
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  activityText: { flex: 1 },
  activityLabel: { ...Typography.body, fontWeight: '500' },
  activityLabelActive: { color: Colors.primaryDark, fontWeight: '600' },
  activityDesc: { ...Typography.caption },
  goalRow: { gap: Spacing.md },
  goalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  goalInput: {
    width: 100,
    height: 52,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  goalSuffix: { ...Typography.body, color: Colors.textSecondary },
  tdeeHint: { gap: 2 },
  tdeeHintText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  tdeeSubText: { ...Typography.caption },
  applyTdeeBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  applyTdeeBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
})

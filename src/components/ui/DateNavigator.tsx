import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Colors, Spacing, Radius, Typography } from '@/constants'
import { calendarTodayIso, parseIsoToLocalNoon } from '@/lib/date-calendar'

interface DateNavigatorProps {
  date: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function formatDate(iso: string): { main: string; sub: string | null } {
  const d = parseIsoToLocalNoon(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dDay.getTime() === today.getTime()) return { main: 'Сегодня', sub: null }
  if (dDay.getTime() === yesterday.getTime()) {
    return {
      main: 'Вчера',
      sub: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    }
  }

  const main = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' })
  return { main, sub: weekday }
}

export function DateNavigator({ date, onPrev, onNext, onToday }: DateNavigatorProps) {
  const today = calendarTodayIso()
  const isToday = date === today
  const { main, sub } = formatDate(date)

  return (
    <View style={styles.container}>
      <Pressable onPress={onPrev} style={styles.arrow} hitSlop={10}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.mainText}>{main}</Text>
        {sub ? <Text style={styles.subText}>{sub}</Text> : null}
        {!isToday ? (
          <Pressable onPress={onToday} style={styles.todayPill}>
            <Text style={styles.todayPillText}>К сегодня</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onNext}
        style={[styles.arrow, isToday && styles.arrowDisabled]}
        disabled={isToday}
        hitSlop={10}
      >
        <Text style={[styles.arrowText, isToday && styles.arrowTextDisabled]}>›</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  arrowDisabled: { opacity: 0.25 },
  arrowText: {
    fontSize: 22,
    color: Colors.text,
    lineHeight: 26,
    fontWeight: '300',
  },
  arrowTextDisabled: { color: Colors.textDisabled },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  mainText: {
    ...Typography.h4,
  },
  subText: {
    ...Typography.caption,
    textTransform: 'capitalize',
  },
  todayPill: {
    marginTop: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.1,
  },
})

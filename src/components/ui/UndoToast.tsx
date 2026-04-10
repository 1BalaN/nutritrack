import { useEffect } from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { Colors, Radius, Spacing, Typography } from '@/constants'

interface UndoToastProps {
  visible: boolean
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({ visible, message, onUndo, onDismiss }: UndoToastProps) {
  const translateY = useSharedValue(100)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.set(withSpring(0, { damping: 20 }))
      opacity.set(withTiming(1, { duration: 200 }))
      const timer = setTimeout(onDismiss, 4000)
      return () => clearTimeout(timer)
    } else {
      translateY.set(withTiming(100, { duration: 250 }))
      opacity.set(withTiming(0, { duration: 200 }))
    }
  }, [visible, onDismiss, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    opacity: opacity.get(),
  }))

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.message} numberOfLines={1}>
        {message}
      </Text>
      <Pressable onPress={onUndo} style={styles.undoButton}>
        <Text style={styles.undoText}>Отменить</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.text,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    zIndex: 999,
  },
  message: {
    ...Typography.body,
    color: Colors.white,
    flex: 1,
    marginRight: Spacing.md,
  },
  undoButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  undoText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
})

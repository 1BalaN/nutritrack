import { View, StyleSheet } from 'react-native'

interface BarcodeIconProps {
  size?: number
  color?: string
}

/** Fewer bars + tight gap so the glyph fits small tap targets (e.g. 32px header button). */
const BARS = [2, 1, 2, 1, 3, 1, 2, 1, 2, 1, 3]

export function BarcodeIcon({ size = 18, color = '#1C1C1E' }: BarcodeIconProps) {
  const totalUnits = BARS.reduce((s, w) => s + w, 0) + BARS.length - 1
  const unitW = size / totalUnits

  return (
    <View style={[styles.container, { width: size, height: size * 0.62 }]}>
      {BARS.map((width, i) => (
        <View
          key={i}
          style={{
            width: Math.max(unitW * width, 0.8),
            height: '100%',
            backgroundColor: color,
            borderRadius: 0.5,
          }}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 0.5,
    alignItems: 'stretch',
    alignSelf: 'center',
  },
})

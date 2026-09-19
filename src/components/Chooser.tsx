import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/theme';

export interface ChooserOption<T> {
  value: T;
  label: string;
  hint?: string;
  selected?: boolean;
}

/**
 * Auswahlblatt von unten. Ersetzt `Alert.alert` mit mehreren Schaltflächen –
 * das gibt es im Browser nicht, und auf dem Handy liest sich das hier besser.
 */
export function Chooser<T>({
  visible,
  title,
  subtitle,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ChooserOption<T>[];
  onSelect(value: T): void;
  onClose(): void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + space.md },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.grabber}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
          </View>

          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700', paddingHorizontal: space.lg }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: theme.textDim, fontSize: 13, paddingHorizontal: space.lg, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}

          <ScrollView style={{ maxHeight: 380, marginTop: space.md }}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.option,
                  { borderTopColor: theme.border },
                  pressed && { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 16 }}>{option.label}</Text>
                  {option.hint ? (
                    <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                      {option.hint}
                    </Text>
                  ) : null}
                </View>
                {option.selected ? <Ionicons name="checkmark" size={19} color={theme.accent} /> : null}
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} style={{ paddingVertical: space.md, alignItems: 'center' }}>
            <Text style={{ color: theme.textDim, fontSize: 16 }}>Abbrechen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  grabber: { alignItems: 'center', paddingBottom: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

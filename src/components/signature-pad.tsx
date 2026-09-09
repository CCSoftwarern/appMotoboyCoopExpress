import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';

import { Colors, Radius } from '@/theme';

interface Point {
  x: number;
  y: number;
}

export interface SignaturePadHandle {
  /** Retorna a URI da imagem PNG, ou null se não houver assinatura. */
  getSignature: () => Promise<string | null>;
  clear: () => void;
  hasSignature: () => boolean;
}

interface Props {
  width?: number;
  height?: number;
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ width, height }, ref) => {
    const [strokes, setStrokes] = useState<Point[][]>([]);
    const currentStroke = useRef<Point[]>([]);
    const containerRef = useRef<View>(null);
    const strokesRef = useRef<Point[][]>([]);
    strokesRef.current = strokes;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          currentStroke.current = [{ x: locationX, y: locationY }];
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          currentStroke.current.push({ x: locationX, y: locationY });
          setStrokes([...strokesRef.current, [...currentStroke.current]]);
        },
        onPanResponderRelease: () => {
          if (currentStroke.current.length > 1) {
            setStrokes([...strokesRef.current, [...currentStroke.current]]);
          }
          currentStroke.current = [];
        },
        onPanResponderTerminate: () => {
          currentStroke.current = [];
        },
      }),
    ).current;

    const toPath = (stroke: Point[]): string =>
      stroke
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

    useImperativeHandle(ref, () => ({
      getSignature: async () => {
        if (!strokesRef.current.length) return null;
        try {
          const uri = await captureRef(containerRef, {
            format: 'png',
            quality: 0.9,
            result: 'tmpfile',
          });
          return uri;
        } catch (e) {
          console.warn('Falha ao capturar assinatura', e);
          return null;
        }
      },
      clear: () => {
        currentStroke.current = [];
        setStrokes([]);
      },
      hasSignature: () => strokesRef.current.length > 0,
    }));

    return (
      <View
        ref={containerRef}
        style={[styles.container, { width, height }]}
        {...panResponder.panHandlers}
        collapsable={false}>
        {strokes.length === 0 ? (
          <Text style={styles.placeholder}>Assine aqui</Text>
        ) : null}
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={toPath(stroke)}
              stroke={Colors.black}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});

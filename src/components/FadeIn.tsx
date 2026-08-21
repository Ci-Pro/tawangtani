import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const FadeIn: React.FC<{
  children: React.ReactNode;
  duration?: number;
  offset?: number;
  style?: object;
}> = ({ children, duration = 320, offset = 14, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, duration]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

export default FadeIn;

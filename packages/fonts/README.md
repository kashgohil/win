# @wingmnn/fonts

Shared Sentient font family for the win monorepo. Used by web, hero, and mobile apps.

## Usage

### Web / Hero (TanStack Start + Vite)

Import the CSS in your app's stylesheet:

```css
@import "@wingmnn/fonts/sentient.css";
```

Then use the font via CSS variables (e.g. `--font-body`, `--font-display`) or directly:

```css
font-family: "Sentient-Variable", Georgia, serif;
```

### Mobile (Expo / React Native)

1. Load the font with `expo-font` before rendering:

```tsx
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Sentient-Variable": require("@wingmnn/fonts/fonts/Sentient-Variable.ttf"),
    "Sentient-VariableItalic": require("@wingmnn/fonts/fonts/Sentient-VariableItalic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (/* your layout */);
}
```

2. Use in styles:

```tsx
<Text style={{ fontFamily: "Sentient-Variable" }}>Hello</Text>
```

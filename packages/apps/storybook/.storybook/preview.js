/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { ThemeProvider } from "@itwin/itwinui-react";
import { themes } from "@storybook/theming";
import { useDarkMode } from "storybook-dark-mode";
import { darkTheme, lightTheme } from "./itwinTheme";
import "@itwin/itwinui-react/styles.css";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  backgrounds: { disable: true },
  controls: { expanded: true },
  darkMode: {
    dark: { ...themes.dark, ...darkTheme },
    light: { ...themes.light, ...lightTheme },
  },
  docs: {
    theme: { ...themes.light, ...lightTheme },
  },
  authClientConfig: {
    clientId: process.env.STORYBOOK_AUTH_CLIENT_ID,
    scope: "itwin-platform",
    authority: "https://qa-ims.bentley.com",
  },
};

export const decorators = [
  (Story) => {
    const isDark = useDarkMode();
    const theme = isDark ? "dark" : "light";

    return (
      <ThemeProvider style={{ background: "transparent" }} theme={theme}>
        <Story />
      </ThemeProvider>
    );
  },
];
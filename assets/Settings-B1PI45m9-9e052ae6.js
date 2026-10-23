import { h as getReact } from "./motion-DRvUZFTr-9e052ae6.js";
import { S as getSettings, l as themes, r as cloaks, v as subscribe, x as updateSettings } from "./settings-ChUBnUQR-9e052ae6.js";

const React = getReact();
const { createElement: h, useEffect, useState } = React;

const styles = {
  page: {
    boxSizing: "border-box",
    color: "var(--text, #e8e8e8)",
    fontFamily: "inherit",
    margin: "0 auto",
    maxWidth: 960,
    padding: "32px 24px 64px",
  },
  heading: { fontSize: 28, fontWeight: 700, margin: "0 0 8px" },
  description: { color: "var(--text-muted, #999)", margin: "0 0 28px" },
  section: {
    background: "var(--bg-1, #202020)",
    border: "1px solid var(--border, #ffffff20)",
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 650, margin: "0 0 4px" },
  sectionDescription: { color: "var(--text-muted, #999)", fontSize: 13, margin: "0 0 18px" },
  field: {
    alignItems: "center",
    borderTop: "1px solid var(--border, #ffffff14)",
    display: "flex",
    gap: 20,
    justifyContent: "space-between",
    minHeight: 56,
    padding: "10px 0",
  },
  label: { fontSize: 14, fontWeight: 550 },
  control: {
    background: "var(--bg-2, #292929)",
    border: "1px solid var(--border, #ffffff24)",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "inherit",
    font: "inherit",
    maxWidth: "min(100%, 320px)",
    minHeight: 38,
    padding: "8px 10px",
  },
};

function option(value, label) {
  return h("option", { key: value, value }, label);
}

function field(label, control, key) {
  return h("label", { key, style: styles.field },
    h("span", { style: styles.label }, label),
    control,
  );
}

function section(title, description, children) {
  return h("section", { key: title, style: styles.section },
    h("h2", { style: styles.sectionTitle }, title),
    h("p", { style: styles.sectionDescription }, description),
    children,
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState(getSettings);

  useEffect(() => {
    const unsubscribe = subscribe(setSettings);
    setSettings(getSettings());
    return unsubscribe;
  }, []);

  const save = (changes) => setSettings(updateSettings(changes));
  const checkbox = (checked, onChange, label) => h("input", {
    "aria-label": label,
    checked: Boolean(checked),
    onChange: (event) => onChange(event.target.checked),
    type: "checkbox",
  });
  const select = (value, onChange, options, label) => h("select", {
    "aria-label": label,
    onChange: (event) => onChange(event.target.value),
    style: styles.control,
    value: value ?? "",
  }, options);
  const textInput = (value, onChange, label, type = "text") => h("input", {
    "aria-label": label,
    onChange: (event) => onChange(event.target.value),
    style: styles.control,
    type,
    value: value ?? "",
  });

  return h("div", { style: styles.page },
    h("h1", { style: styles.heading }, "Settings"),
    h("p", { style: styles.description }, "Personalize Fern and manage your preferences."),
    section("Appearance", "Choose a theme and adjust its colors.", [
      field("Theme", select(
        settings.theme,
        (theme) => save({ theme }),
        themes.map(({ id, label }) => option(id, label)),
        "Theme",
      ), "theme"),
      field("Color mode", select(
        settings.customTheme?.mode ?? "dark",
        (mode) => save({ customTheme: { ...settings.customTheme, mode } }),
        [option("dark", "Dark"), option("light", "Light")],
        "Color mode",
      ), "mode"),
      field("Accent color", textInput(
        settings.customTheme?.accent ?? "#c2ffe0",
        (accent) => save({ customTheme: { ...settings.customTheme, accent } }),
        "Accent color",
        "color",
      ), "accent"),
      field("Glass effect", checkbox(
        settings.glass?.enabled,
        (enabled) => save({ glass: { ...settings.glass, enabled } }),
        "Glass effect",
      ), "glass"),
    ]),
    section("Navigation", "Control helpful hints and page behavior.", [
      field("Show keyboard shortcuts", checkbox(
        settings.showShortcuts,
        (showShortcuts) => save({ showShortcuts }),
        "Show keyboard shortcuts",
      ), "shortcuts"),
      field("Confirm before leaving", checkbox(
        settings.confirmBeforeLeave,
        (confirmBeforeLeave) => save({ confirmBeforeLeave }),
        "Confirm before leaving",
      ), "leave-confirmation"),
    ]),
    section("Privacy", "Choose the appearance used when Fern is cloaked.", [
      field("Cloak appearance", select(
        settings.cloak,
        (cloak) => save({ cloak }),
        cloaks.map(({ id, label }) => option(id, label)),
        "Cloak appearance",
      ), "cloak"),
      field("Panic key", textInput(
        settings.panicKey,
        (panicKey) => save({ panicKey }),
        "Panic key",
      ), "panic-key"),
      field("Panic destination", textInput(
        settings.panicUrl,
        (panicUrl) => save({ panicUrl }),
        "Panic destination",
        "url",
      ), "panic-url"),
    ]),
    section("Search", "Set the search engine used for searches.", [
      field("Search engine", textInput(
        settings.searchEngine,
        (searchEngine) => save({ searchEngine }),
        "Search engine",
      ), "search-engine"),
      field("Custom search template", textInput(
        settings.customSearchTemplate,
        (customSearchTemplate) => save({ customSearchTemplate }),
        "Custom search template",
      ), "search-template"),
    ]),
  );
}

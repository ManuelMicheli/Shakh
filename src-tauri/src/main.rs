// Nasconde la console su Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// App desktop Shakh: guscio nativo (WebView2 su Windows) che carica il sito
// di produzione in una finestra dedicata. L'app vera resta server-side
// (SSR/Server Actions/Supabase/coach AI), quindi qui non si impacchetta nulla
// di offline — la URL è in tauri.conf.json (build.frontendDist).
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("errore nell'avvio dell'app Shakh");
}

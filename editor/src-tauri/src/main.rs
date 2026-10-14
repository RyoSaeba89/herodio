// Herodio Studio — application Windows (Tauri). L'interface est dans ../src (React).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::ipc::{InvokeBody, Request, Response};

/// Écrit un fichier choisi par l'utilisateur (via un fichier temporaire pour ne jamais laisser un fichier à moitié écrit).
#[tauri::command]
fn write_file(request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(data) = request.body() else { return Err("données invalides".into()) };
    let path = request.headers().get("path").and_then(|v| v.to_str().ok()).ok_or("chemin manquant")?;
    let path = urlencoding::decode(path).map_err(|e| e.to_string())?.into_owned();
    let tmp = format!("{path}.tmp");
    std::fs::write(&tmp, data).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    std::fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_file, read_file])
        .run(tauri::generate_context!())
        .expect("impossible de démarrer Herodio Studio");
}

// Icône de l'exécutable Windows (sans effet sur Linux et Raspberry Pi).
fn main() {
    embed_resource::compile("herodio-player.rc", embed_resource::NONE).manifest_optional().unwrap();
}

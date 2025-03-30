use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_llm::{ChatMessage, Model, Role};
use std::cell::RefCell;

#[update]
async fn prompt(prompt_str: String) -> String {
    ic_llm::prompt(Model::Llama3_1_8B, prompt_str).await
}

#[update]
async fn chat(mut messages: Vec<ChatMessage>) -> String {
    let system_message = ChatMessage {
        role: Role::System,
        content: "Eres un asistente especializado en Turismo 3.0. Ayuda a los usuarios a descubrir tours auténticos, gestionar reservas seguras y comprender la economía local descentralizada mediante blockchain, tokens y verificaciones on-chain. Responde de forma clara, precisa y con ejemplos prácticos.".to_string(),
    };
    messages.insert(0, system_message);
    ic_llm::chat(Model::Llama3_1_8B, messages).await
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Tour {
    pub id: u64,
    pub titulo: String,
    pub descripcion: String,
    pub precio: u64,
    pub categorias: Vec<String>, // NUEVO: categorías asociadas al tour.
    pub creador: Principal,
    pub disponible: bool,
}

thread_local! {
    static TOURS: RefCell<Vec<Tour>> = RefCell::new(Vec::new());
    static TOUR_COUNTER: RefCell<u64> = RefCell::new(0);
}

/// Crea un nuevo tour, asignándole un ID único, y retorna ese ID.
/// Se recibe un vector de categorías junto con los otros campos.
#[update]
fn crear_tour(titulo: String, descripcion: String, precio: u64, categorias: Vec<String>) -> u64 {
    let caller = ic_cdk::caller();
    TOUR_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        *counter += 1;
        let id = *counter;
        let new_tour = Tour {
            id,
            titulo,
            descripcion,
            precio,
            categorias, // Se guarda la selección del usuario.
            creador: caller,
            disponible: true,
        };
        TOURS.with(|tours| {
            tours.borrow_mut().push(new_tour);
        });
        id
    })
}

#[query]
fn obtener_tours() -> Vec<Tour> {
    TOURS.with(|tours| tours.borrow().clone())
}

ic_cdk::export_candid!();

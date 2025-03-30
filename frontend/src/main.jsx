import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { backend } from 'declarations/backend';
import { AuthClient } from '@dfinity/auth-client';
import userImg from '/user.svg';
import botImg from '/bot.svg';
import '/index.css';

// Opciones de categorías disponibles
const categoryOptions = [
  "Hoteles",
  "Aviones",
  "Transporte",
  "Restaurantes",
  "Museos",
  "Lugares Turísticos"
];

const ChatbotAssistant = ({ onClose }) => {
  // Estado del chat del asistente
  const [chat, setChat] = useState([
    {
      role: { system: null },
      content: "Soy tu asistente de Turismo 3.0. ¿En qué puedo ayudarte?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const askAssistant = async (messages) => {
    try {
      const response = await backend.chat(messages);
      setChat((prevChat) => {
        const newChat = [...prevChat];
        newChat.pop(); // Quita el mensaje "Thinking..."
        newChat.push({ role: { system: null }, content: response });
        return newChat;
      });
    } catch (e) {
      console.error("Error en el chat:", e);
      setChat((prevChat) => {
        const newChat = [...prevChat];
        newChat.pop();
        newChat.push({ role: { system: null }, content: "Ocurrió un error, intenta nuevamente." });
        return newChat;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isChatLoading) return;
    const userMessage = { role: { user: null }, content: inputValue };
    const thinkingMessage = { role: { system: null }, content: "Thinking..." };
    setChat((prevChat) => [...prevChat, userMessage, thinkingMessage]);
    setInputValue('');
    setIsChatLoading(true);
    const messagesToSend = chat.slice(1).concat(userMessage);
    askAssistant(messagesToSend);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-[80vh] rounded-lg bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between bg-blue-500 p-3 text-white rounded-t-lg">
        <span>Asistente Chatbot</span>
        <button onClick={onClose} className="text-xl font-bold">
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 bg-gray-100">
        {chat.map((message, index) => {
          const isUser = 'user' in message.role;
          const img = isUser ? userImg : botImg;
          const name = isUser ? 'Tú' : 'Asistente';
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
              {!isUser && (
                <div
                  className="mr-2 h-8 w-8 rounded-full"
                  style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                ></div>
              )}
              <div className={`max-w-[70%] rounded-lg p-2 ${isUser ? 'bg-blue-500 text-white' : 'bg-white shadow'}`}>
                <div className="text-xs mb-1">{name}</div>
                <div className="text-sm">{message.content}</div>
              </div>
              {isUser && (
                <div
                  className="ml-2 h-8 w-8 rounded-full"
                  style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                ></div>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={handleChatSubmit} className="flex border-t p-2">
        <input
          type="text"
          placeholder="Escribe tu mensaje..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isChatLoading}
          className="flex-1 rounded-l border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isChatLoading}
          className="rounded-r bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

const App = () => {
  // Estados para autenticación
  const [principal, setPrincipal] = useState(null);
  const [authClient, setAuthClient] = useState(null);

  // Estados para tours
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [creatingTour, setCreatingTour] = useState(false);
  const [newTour, setNewTour] = useState({
    title: '',
    description: '',
    price: '',
    categorias: []  // NUEVO: para almacenar las categorías seleccionadas.
  });

  // Estado para mostrar/ocultar el chatbot
  const [showChatbot, setShowChatbot] = useState(false);

  // Inicializar AuthClient
  useEffect(() => {
    AuthClient.create().then((client) => {
      setAuthClient(client);
      if (client.isAuthenticated()) {
        setPrincipal(client.getIdentity().getPrincipal().toText());
      }
    });
  }, []);

  // Función para iniciar sesión con Internet Identity
  const handleLogin = async () => {
    if (!authClient) return;
    await authClient.login({
      identityProvider: "https://identity.ic0.app/#authorize",
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setPrincipal(identity.getPrincipal().toText());
      }
    });
  };

  // Función para cargar tours desde el canister
  const fetchTours = async () => {
    setLoadingTours(true);
    try {
      const toursFromBackend = await backend.obtener_tours();
      setTours(toursFromBackend);
    } catch (error) {
      console.error("Error al cargar los tours:", error);
    } finally {
      setLoadingTours(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // Manejo de cambios en el formulario de tours
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTour((prev) => ({ ...prev, [name]: value }));
  };

  // Manejo de la selección de categorías
  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    setNewTour((prev) => {
      let newCategorias = [...prev.categorias];
      if (checked) {
        // Si se selecciona, se añade la categoría
        newCategorias.push(value);
      } else {
        // Si se deselecciona, se remueve
        newCategorias = newCategorias.filter((cat) => cat !== value);
      }
      return { ...prev, categorias: newCategorias };
    });
  };

  // Función para crear un tour
  const handleCreateTour = async (e) => {
    e.preventDefault();
    if (!newTour.title.trim() || !newTour.description.trim() || !newTour.price.trim()) {
      alert("Por favor, completa todos los campos.");
      return;
    }
    const price = parseInt(newTour.price, 10);
    if (isNaN(price)) {
      alert("El precio debe ser un número.");
      return;
    }
    setCreatingTour(true);
    try {
      // Se envía también el vector de categorías
      const tourId = await backend.crear_tour(newTour.title, newTour.description, price, newTour.categorias);
      console.log("Tour creado con ID:", tourId);
      fetchTours();
      setNewTour({ title: '', description: '', price: '', categorias: [] });
    } catch (error) {
      console.error("Error al crear el tour:", error);
      alert("Error al crear el tour.");
    } finally {
      setCreatingTour(false);
    }
  };

  // Funciones dummy para reservas y reseñas
  const handleReservar = (tourId) => {
    alert(`Reserva realizada para el tour ID ${tourId} (funcionalidad en construcción).`);
  };

  const handleResenhar = (tourId) => {
    alert(`Funcionalidad de reseñas para el tour ID ${tourId} en construcción.`);
  };

  // Si el usuario no está autenticado, muestra la pantalla de login primero
  if (!principal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded shadow">
          <h1 className="text-3xl font-bold mb-4">Bienvenido a TravelChain</h1>
          <button onClick={handleLogin} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Iniciar Sesión con Internet Identity
          </button>
        </div>
      </div>
    );
  }

  // Una vez autenticado, muestra la interfaz completa
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header con autenticación */}
      <header className="flex items-center justify-between bg-blue-500 p-4 text-white">
        <h1 className="text-2xl font-bold">TravelChain</h1>
        <div>
          <span>Bienvenido, {principal}</span>
        </div>
      </header>

      {/* Contenido principal: panel de tours y formulario */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Panel de tours estilo chat */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {loadingTours ? (
            <p>Cargando tours...</p>
          ) : tours.length === 0 ? (
            <p>No hay tours disponibles. ¡Crea uno nuevo!</p>
          ) : (
            tours.map((tour, index) => {
              const isUser =
                principal &&
                tour.creador &&
                (tour.creador.toText ? tour.creador.toText() === principal : tour.creador === principal);
              const img = isUser ? userImg : botImg;
              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                  {!isUser && (
                    <div
                      className="mr-2 h-10 w-10 rounded-full"
                      style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                    ></div>
                  )}
                  <div className={`max-w-[70%] rounded-lg p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-white shadow'}`}>
                    <h2 className="text-xl font-semibold">{tour.titulo}</h2>
                    <p>{tour.descripcion}</p>
                    <p className="text-sm text-gray-600">Precio: ${tour.precio}</p>
                    <p className="text-xs text-gray-500">
                      Creado por: {tour.creador.toText ? tour.creador.toText() : tour.creador}
                    </p>
                    {tour.categorias && tour.categorias.length > 0 && (
                      <div className="mt-1">
                        <strong className="text-xs">Categorías: </strong>
                        <span className="text-xs">{tour.categorias.join(", ")}</span>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReservar(tour.id)}
                        className="rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600 text-xs"
                      >
                        Reservar
                      </button>
                      <button
                        onClick={() => handleResenhar(tour.id)}
                        className="rounded bg-yellow-500 px-2 py-1 text-white hover:bg-yellow-600 text-xs"
                      >
                        Reseñar
                      </button>
                    </div>
                  </div>
                  {isUser && (
                    <div
                      className="ml-2 h-10 w-10 rounded-full"
                      style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                    ></div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Formulario para crear un nuevo tour */}
        <div className="w-full md:w-1/3 border-l bg-white p-4">
          <h2 className="mb-4 text-xl font-bold">Crear Nuevo Tour</h2>
          <form onSubmit={handleCreateTour} className="flex flex-col gap-3">
            <input
              type="text"
              name="title"
              placeholder="Título del tour"
              value={newTour.title}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            <textarea
              name="description"
              placeholder="Descripción del tour"
              value={newTour.description}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="price"
              placeholder="Precio"
              value={newTour.price}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            {/* Sección de categorías */}
            <div>
              <p className="mb-2 font-semibold">Selecciona las partes del tour:</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <label key={category} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      value={category}
                      checked={newTour.categorias.includes(category)}
                      onChange={handleCategoryChange}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creatingTour}
              className="rounded bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
            >
              {creatingTour ? "Creando tour..." : "Crear Tour"}
            </button>
          </form>
        </div>
      </div>

      {/* Botón flotante para abrir el chatbot asistente */}
      <button
        onClick={() => setShowChatbot(true)}
        className="fixed bottom-4 left-4 rounded-full bg-blue-500 p-4 text-white shadow-lg hover:bg-blue-600"
      >
        Asistente
      </button>

      {/* Renderizar el panel del chatbot si está activado */}
      {showChatbot && <ChatbotAssistant onClose={() => setShowChatbot(false)} />}
    </div>
  );
};

export default App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

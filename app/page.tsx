"use client";

import React, { useState, useEffect } from "react";
import {
  LogIn,
  Plus,
  Edit2,
  Trash2,
  Clock,
  ArrowLeft,
  KeyRound,
  UserPlus,
  ShieldCheck,
  BarChart3,
  Trophy,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Partido {
  id: number;
  equipoLocal: string;
  equipoVisitante: string;
  escudoLocal: string;
  escudoVisitante: string;
  bandera?: string;
  fechaHora: string;
  activo?: number;
}

interface Pronostico {
  partidoid: number;
  goleslocal: number;
  golesvisita: number;
  goleadorid?: number | null;
  nombregoleador?: string | null;
  fotogoleador?: string | null;
  escudogoleador?: string | null;
}

interface Jugador {
  id: number;
  nombre: string;
  foto: string;
  escudo_equipo: string;
  nombre_equipo: string;
}

interface CountdownInfo {
  texto: string;
  expirado: boolean;
}

const inputClassName =
  "w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-gray-900 font-medium placeholder:text-gray-500";

export default function FootballPredictionsApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState("login");
  const [currentSection, setCurrentSection] = useState("pronosticos");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [loggedUsername, setLoggedUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keypass, setkeypass] = useState("");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [pronosticos, setPronosticos] = useState<Record<number, Pronostico>>(
    {}
  );
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [tempPronosticos, setTempPronosticos] = useState<Record<number, any>>(
    {}
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [countdown, setCountdown] = useState<Record<number, CountdownInfo>>({});
  const [showGoleadorModal, setShowGoleadorModal] = useState(false);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<Jugador[]>(
    []
  );
  const [partidoSeleccionado, setPartidoSeleccionado] =
    useState<Partido | null>(null);
  const [loading, setLoading] = useState(false);
  const [detallesExpandidos, setDetallesExpandidos] = useState<
    Record<number, any>
  >({});
  const [busquedaGoleador, setBusquedaGoleador] = useState("");
  const [estadisticasReales, setEstadisticasReales] = useState<any[]>([]);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);
  const [pronosticosUsuariosReales, setPronosticosUsuariosReales] = useState<
    any[]
  >([]);
  const [loadingPronosticosUsuarios, setLoadingPronosticosUsuarios] =
    useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setLoggedUsername(savedUsername);
      setIsLoggedIn(true);
      fetchPartidos(savedToken);
      fetchPronosticos(savedToken);
      fetchEstadisticas(savedToken);
      fetchPronosticosUsuarios(savedToken);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdown: Record<number, CountdownInfo> = {};
      partidos.forEach((partido) => {
        const fechaPartido = new Date(partido.fechaHora);
        const deadline = new Date(fechaPartido.getTime() - 4 * 60 * 60 * 1000);
        const ahora = new Date();
        const diferencia = deadline.getTime() - ahora.getTime();

        if (diferencia > 0) {
          const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
          const horas = Math.floor(
            (diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutos = Math.floor(
            (diferencia % (1000 * 60 * 60)) / (1000 * 60)
          );
          const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

          newCountdown[partido.id] = {
            texto:
              dias > 0
                ? `${dias}d ${horas}h ${minutos}m`
                : `${horas}h ${minutos}m ${segundos}s`,
            expirado: false,
          };
        } else {
          newCountdown[partido.id] = {
            texto: "Cerrado",
            expirado: true,
          };
        }
      });
      setCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(timer);
  }, [partidos]);

  const resetAuthForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setkeypass("");
    setError("");
    setSuccess("");
  };

  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const jugadoresFiltrados = jugadoresDisponibles.filter((jugador) => {
    if (!busquedaGoleador) return true;
    const nombreNormalizado = normalizarTexto(jugador.nombre);
    const busquedaNormalizada = normalizarTexto(busquedaGoleador);
    return nombreNormalizado.includes(busquedaNormalizada);
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Credenciales inválidas");

      const data = await res.json();
      setToken(data.access_token);
      setLoggedUsername(data.username);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("username", data.username);
      setIsLoggedIn(true);
      setCurrentSection("pronosticos");
      fetchPartidos(data.access_token);
      fetchPronosticos(data.access_token);
      fetchEstadisticas(data.access_token);
      resetAuthForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (keypass.length < 4) {
      setError("La palabra clave debe tener al menos 4 caracteres");
      return;
    }

    try {
      // 1. Registrar el usuario
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, keypass }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al registrar usuario");
      }

      setSuccess("Cuenta creada exitosamente. Iniciando sesión...");

      // 2. Hacer login automático después de 1 segundo
      setTimeout(async () => {
        try {
          const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          if (!loginRes.ok) throw new Error("Error al iniciar sesión");

          const loginData = await loginRes.json();

          // 3. Guardar token y username
          setToken(loginData.access_token);
          setLoggedUsername(loginData.username);
          localStorage.setItem("token", loginData.access_token);
          localStorage.setItem("username", loginData.username);

          // 4. Actualizar estado de login
          setIsLoggedIn(true);
          setCurrentSection("pronosticos");

          // 5. Cargar datos iniciales
          fetchPartidos(loginData.access_token);
          fetchPronosticos(loginData.access_token);
          fetchEstadisticas(loginData.access_token);
          fetchPronosticosUsuarios(loginData.access_token);

          // 6. Limpiar formulario
          resetAuthForm();
        } catch (loginErr) {
          // Si falla el login automático, redirigir al login manual
          setError(
            "Cuenta creada, pero hubo un error al iniciar sesión. Por favor, inicia sesión manualmente."
          );
          setTimeout(() => {
            setView("login");
            resetAuthForm();
          }, 2000);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleRecover = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, keypass, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Usuario o palabra clave incorrectos");
      }

      setSuccess(
        "¡Contraseña actualizada exitosamente! Redirigiendo al login en 3 segundos..."
      );
      setTimeout(() => {
        setView("login");
        resetAuthForm();
      }, 3000); // Cambiado a 3000ms (3 segundos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const fetchPartidos = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/partidos`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const sortedData = Array.isArray(data)
        ? data.sort(
            (a, b) =>
              new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
          )
        : [];

      setPartidos(sortedData);
    } catch (err) {
      console.error("Error fetching partidos:", err);
      setPartidos([]);
    }
  };

  const fetchEstadisticas = async (authToken: string) => {
    setLoadingEstadisticas(true);
    try {
      const res = await fetch(`${API_URL}/partidos/estadisticas`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Procesar los datos para calcular estadísticas por usuario
      const estadisticasPorUsuario = procesarEstadisticas(data);
      setEstadisticasReales(estadisticasPorUsuario);
    } catch (err) {
      console.error("Error fetching estadisticas:", err);
      setEstadisticasReales([]);
    } finally {
      setLoadingEstadisticas(false);
    }
  };

  const fetchPronosticosUsuarios = async (authToken: string) => {
    setLoadingPronosticosUsuarios(true);
    try {
      const res = await fetch(`${API_URL}/partidos/pronosticos-activos`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Procesar los datos para agruparlos por partido
      const partidosMap: Record<number, any> = {};

      data.forEach((pronostico: any) => {
        const partidoId = pronostico.partidoId;

        if (!partidosMap[partidoId]) {
          partidosMap[partidoId] = {
            id: partidoId,
            equipoLocal: pronostico.equipoLocal,
            equipoVisitante: pronostico.equipoVisitante,
            escudoLocal: pronostico.escudoLocal,
            escudoVisitante: pronostico.escudoVisitante,
            fechaHora: pronostico.fechaHora,
            pronosticos: [],
          };
        }

        partidosMap[partidoId].pronosticos.push({
          id: pronostico.pronosticoId,
          usuario: pronostico.username,
          golesLocal: pronostico.golesLocal,
          golesVisita: pronostico.golesVisita,
          goleador: pronostico.nombreGoleador // ⬅️ Verifica que nombreGoleador exista
            ? {
                nombre: pronostico.nombreGoleador,
                foto: pronostico.fotoGoleador,
              }
            : null, // ⬅️ null si no hay goleador
          estado: "pendiente",
        });
      });

      // Convertir el map a array y ordenar por fecha
      const partidosArray = Object.values(partidosMap).sort(
        (a, b) =>
          new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
      );

      setPronosticosUsuariosReales(partidosArray);
    } catch (err) {
      console.error("Error fetching pronosticos usuarios:", err);
      setPronosticosUsuariosReales([]);
    } finally {
      setLoadingPronosticosUsuarios(false);
    }
  };

  // Actualiza la función del botón "Guardar Pronósticos"
  const guardarPronosticos = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // 1. Preparar los datos a enviar
      const pronosticosParaGuardar: Array<{
        partidoId: number;
        golesLocal: number;
        golesVisita: number;
        jugadorId: number | null;
      }> = [];

      // Recorrer tempPronosticos y pronosticos existentes
      Object.keys(tempPronosticos).forEach((partidoIdStr) => {
        const partidoId = parseInt(partidoIdStr);
        const temp = tempPronosticos[partidoId];
        const existente = pronosticos[partidoId];

        // Obtener los valores finales
        const golesLocal = temp?.golesLocal ?? existente?.goleslocal;
        const golesVisita = temp?.golesVisita ?? existente?.golesvisita;
        const jugadorId = temp?.goleadorid ?? existente?.goleadorid ?? null;

        // Solo incluir si tiene goles definidos
        if (
          golesLocal !== undefined &&
          golesLocal !== "" &&
          golesVisita !== undefined &&
          golesVisita !== ""
        ) {
          pronosticosParaGuardar.push({
            partidoId: partidoId,
            golesLocal: parseInt(golesLocal.toString()),
            golesVisita: parseInt(golesVisita.toString()),
            jugadorId: jugadorId ? parseInt(jugadorId.toString()) : null,
          });
        }
      });

      // Validar que haya al menos un pronóstico
      if (pronosticosParaGuardar.length === 0) {
        setError("No hay pronósticos para guardar");
        setLoading(false);
        return;
      }

      // 2. Enviar al backend
      const res = await fetch(`${API_URL}/predictions/guardar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pronosticos: pronosticosParaGuardar,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al guardar pronósticos");
      }

      const data = await res.json();

      // 3. Mostrar mensaje de éxito
      setSuccess(data.message || "Pronósticos guardados exitosamente");

      // 4. Limpiar tempPronosticos
      setTempPronosticos({});

      // 5. Recargar la página después de 1.5 segundos
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  };

  const procesarEstadisticas = (pronosticos: any[]) => {
    const usuariosMap: Record<number, any> = {};

    pronosticos.forEach((p: any) => {
      if (!usuariosMap[p.usuarioId]) {
        usuariosMap[p.usuarioId] = {
          id: p.usuarioId,
          nombre: p.username,
          resultadosAcertados: 0,
          goleadoresAcertados: 0,
          totalGanado: 0,
          detalleResultados: [],
          detalleGoleadores: [],
        };
      }

      const usuario = usuariosMap[p.usuarioId];

      if (p.acertadoResultado) {
        usuario.resultadosAcertados++;
        usuario.totalGanado += 1000000;
        usuario.detalleResultados.push({
          equipoLocal: p.equipoLocal,
          equipoVisitante: p.equipoVisitante,
          escudoLocal: p.escudoLocal,
          escudoVisitante: p.escudoVisitante,
          marcador: `${p.golesLocal}-${p.golesVisita}`,
          fecha: new Date(p.fechaHora).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        });
      }

      if (p.acertadoGoleador) {
        usuario.goleadoresAcertados++;
        usuario.totalGanado += 500000;
        usuario.detalleGoleadores.push({
          jugador: p.nombreGoleador,
          foto: p.fotoGoleador,
          escudo: p.escudoGoleador,
          partido: `${p.equipoLocal} vs ${p.equipoVisitante}`,
          escudoLocal: p.escudoLocal,
          escudoVisitante: p.escudoVisitante,
          marcador: `${p.golesLocal}-${p.golesVisita}`,
          fecha: new Date(p.fechaHora).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        });
      }

      if (p.acertadoResultado && p.acertadoGoleador) {
        usuario.totalGanado += 500000;
      }
    });

    return Object.values(usuariosMap).sort(
      (a: any, b: any) => b.totalGanado - a.totalGanado
    );
  };

  const fetchJugadoresPartido = async (partidoId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/partidos/${partidoId}/jugadores`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Error al cargar jugadores");

      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching jugadores:", err);
      setError("Error al cargar jugadores");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchPronosticos = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/partidos/mis-pronosticos`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Convertir array a objeto indexado por partidoid
      const pronosticosMap: Record<number, Pronostico> = {};
      data.forEach((p: any) => {
        pronosticosMap[p.partidoid] = p;
      });

      setPronosticos(pronosticosMap);
    } catch (err) {
      console.error("Error fetching pronosticos:", err);
      setPronosticos({});
    }
  };

  const abrirModalGoleador = async (partido: Partido) => {
    setPartidoSeleccionado(partido);
    setBusquedaGoleador("");
    const jugadores = await fetchJugadoresPartido(partido.id);
    setJugadoresDisponibles(jugadores);
    setShowGoleadorModal(true);
  };

  const seleccionarGoleador = async (jugador: Jugador) => {
    if (!partidoSeleccionado) return;

    // Actualizar el pronóstico con la información del goleador
    setPronosticos((prevPronosticos) => ({
      ...prevPronosticos,
      [partidoSeleccionado.id]: {
        // Si ya existe un pronóstico, mantener sus datos, sino crear objeto vacío
        ...(prevPronosticos[partidoSeleccionado.id] || {}),
        partidoid: partidoSeleccionado.id,
        goleadorid: jugador.id,
        nombregoleador: jugador.nombre,
        fotogoleador: jugador.foto,
        escudogoleador: jugador.escudo_equipo,
      },
    }));

    // También actualizar tempPronosticos para mantener consistencia
    setTempPronosticos((prevTemp) => ({
      ...prevTemp,
      [partidoSeleccionado.id]: {
        // Si ya existe tempPronostico, mantener sus datos, sino crear objeto vacío
        ...(prevTemp[partidoSeleccionado.id] || {}),
        goleadorid: jugador.id,
      },
    }));

    setShowGoleadorModal(false);
  };

  // Datos de prueba para pronósticos de usuarios
  const pronosticosUsuarios = [
    {
      id: 1,
      equipoLocal: "Real Madrid",
      equipoVisitante: "Barcelona",
      escudoLocal:
        "https://ssl.gstatic.com/onebox/media/sports/logos/Th4fAVAZeCJWRcKoLW7koA_48x48.png",
      escudoVisitante:
        "https://ssl.gstatic.com/onebox/media/sports/logos/paYnEE8hcrP96neHRNofhQ_48x48.png",
      bandera: "https://flagcdn.com/w40/es.png",
      fecha: "15 Ene 2025",
      hora: "15:00",
      pronosticos: [
        {
          id: 1,
          usuario: "JuanPerez",
          golesLocal: 2,
          golesVisita: 1,
          goleador: {
            nombre: "Vinícius Jr",
            foto: "https://img.a.transfermarkt.technology/portrait/big/371998-1682683695.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/Th4fAVAZeCJWRcKoLW7koA_48x48.png",
          },
          estado: "pendiente",
        },
        {
          id: 2,
          usuario: "MariaLopez",
          golesLocal: 1,
          golesVisita: 2,
          goleador: {
            nombre: "Robert Lewandowski",
            foto: "https://img.a.transfermarkt.technology/portrait/big/38253-1710080339.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/paYnEE8hcrP96neHRNofhQ_48x48.png",
          },
          estado: "pendiente",
        },
        {
          id: 3,
          usuario: "CarlosRuiz",
          golesLocal: 2,
          golesVisita: 2,
          goleador: {
            nombre: "Jude Bellingham",
            foto: "https://img.a.transfermarkt.technology/portrait/big/581678-1703001449.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/Th4fAVAZeCJWRcKoLW7koA_48x48.png",
          },
          estado: "pendiente",
        },
        {
          id: 4,
          usuario: "AnaGomez",
          golesLocal: 3,
          golesVisita: 1,
          goleador: null,
          estado: "pendiente",
        },
      ],
    },
    {
      id: 2,
      equipoLocal: "Manchester City",
      equipoVisitante: "Liverpool",
      escudoLocal:
        "https://ssl.gstatic.com/onebox/media/sports/logos/z44I6k96K6Mo1AjnjdX2kQ_48x48.png",
      escudoVisitante:
        "https://ssl.gstatic.com/onebox/media/sports/logos/EZLOObUI9jwhJEO8J2EO6Q_48x48.png",
      bandera: "https://flagcdn.com/w40/gb-eng.png",
      fecha: "16 Ene 2025",
      hora: "17:30",
      pronosticos: [
        {
          id: 1,
          usuario: "JuanPerez",
          golesLocal: 1,
          golesVisita: 1,
          goleador: {
            nombre: "Erling Haaland",
            foto: "https://img.a.transfermarkt.technology/portrait/big/418560-1694609670.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/z44I6k96K6Mo1AjnjdX2kQ_48x48.png",
          },
          estado: "acertado",
        },
        {
          id: 2,
          usuario: "LuisMartinez",
          golesLocal: 2,
          golesVisita: 0,
          goleador: {
            nombre: "Kevin De Bruyne",
            foto: "https://img.a.transfermarkt.technology/portrait/big/88755-1661933428.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/z44I6k96K6Mo1AjnjdX2kQ_48x48.png",
          },
          estado: "fallado",
        },
        {
          id: 3,
          usuario: "CarlosRuiz",
          golesLocal: 1,
          golesVisita: 3,
          goleador: {
            nombre: "Mohamed Salah",
            foto: "https://img.a.transfermarkt.technology/portrait/big/148455-1667830788.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/EZLOObUI9jwhJEO8J2EO6Q_48x48.png",
          },
          estado: "fallado",
        },
      ],
    },
    {
      id: 3,
      equipoLocal: "PSG",
      equipoVisitante: "Marseille",
      escudoLocal:
        "https://ssl.gstatic.com/onebox/media/sports/logos/KLDWYp-H8CAOT9H_JgizRg_48x48.png",
      escudoVisitante:
        "https://ssl.gstatic.com/onebox/media/sports/logos/4w2Z97Hf3AEbd3kHcvAC5g_48x48.png",
      bandera: "https://flagcdn.com/w40/fr.png",
      fecha: "17 Ene 2025",
      hora: "20:00",
      pronosticos: [
        {
          id: 1,
          usuario: "MariaLopez",
          golesLocal: 3,
          golesVisita: 0,
          goleador: {
            nombre: "Kylian Mbappé",
            foto: "https://img.a.transfermarkt.technology/portrait/big/342229-1682683695.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/KLDWYp-H8CAOT9H_JgizRg_48x48.png",
          },
          estado: "pendiente",
        },
        {
          id: 2,
          usuario: "AnaGomez",
          golesLocal: 2,
          golesVisita: 1,
          goleador: {
            nombre: "Ousmane Dembélé",
            foto: "https://img.a.transfermarkt.technology/portrait/big/288230-1668422607.jpg?lm=1",
            escudo:
              "https://ssl.gstatic.com/onebox/media/sports/logos/KLDWYp-H8CAOT9H_JgizRg_48x48.png",
          },
          estado: "pendiente",
        },
      ],
    },
  ];

  const toggleDetalles = (usuarioId: number, tipo: string) => {
    setDetallesExpandidos((prev) => ({
      ...prev,
      [usuarioId]: {
        ...prev[usuarioId],
        [tipo]: !prev[usuarioId]?.[tipo],
      },
    }));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setToken("");
    setLoggedUsername("");
    setPartidos([]);
    setCurrentSection("pronosticos");
  };

  const menuItems = [
    { id: "pronosticos", label: "Pronósticos", icon: Trophy },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-20 -z-10"></div>

          {view !== "login" && (
            <button
              onClick={() => {
                setView("login");
                resetAuthForm();
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Volver al inicio</span>
            </button>
          )}

          <div className="flex items-center justify-center mb-6">
            <div
              className={`p-4 rounded-2xl shadow-lg ${
                view === "login"
                  ? "bg-gradient-to-br from-purple-600 to-blue-600"
                  : view === "register"
                  ? "bg-gradient-to-br from-emerald-600 to-teal-600"
                  : "bg-gradient-to-br from-amber-600 to-orange-600"
              }`}
            >
              {view === "login" && <LogIn className="w-8 h-8 text-white" />}
              {view === "register" && (
                <UserPlus className="w-8 h-8 text-white" />
              )}
              {view === "recover" && (
                <ShieldCheck className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {view === "login" && "Pronósticos Fútbol"}
            {view === "register" && "Crear Cuenta"}
            {view === "recover" && "Recuperar Acceso"}
          </h1>
          <p className="text-center text-gray-600 mb-6 font-medium">
            {view === "login" && "Ingresa tus credenciales"}
            {view === "register" && "Completa tus datos"}
            {view === "recover" && "Restablece tu contraseña"}
          </p>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">
              {success}
            </div>
          )}

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClassName}
                  placeholder="Tu nombre de usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Tu contraseña"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all"
              >
                Iniciar Sesión
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-600 font-semibold">
                    o continúa con
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 py-3 rounded-xl font-bold hover:from-emerald-100 hover:to-teal-100 transition-all border-2 border-emerald-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Crear cuenta
                </button>

                <button
                  type="button"
                  onClick={() => setView("recover")}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 py-3 rounded-xl font-bold hover:from-amber-100 hover:to-orange-100 transition-all border-2 border-amber-200"
                >
                  <KeyRound className="w-4 h-4" />
                  Recuperar
                </button>
              </div>
            </form>
          )}

          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClassName}
                  placeholder="Elige un nombre de usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Repite tu contraseña"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Palabra Clave de Recuperación
                </label>
                <input
                  type="text"
                  value={keypass}
                  onChange={(e) => setkeypass(e.target.value)}
                  className={inputClassName}
                  placeholder="Elige una palabra secreta"
                  required
                  minLength={4}
                />
                <p className="text-xs text-gray-600 mt-2 flex items-start gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Úsala para recuperar tu cuenta si olvidas la contraseña
                  </span>
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all"
              >
                Crear Cuenta
              </button>
            </form>
          )}

          {view === "recover" && (
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClassName}
                  placeholder="Tu nombre de usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Palabra Clave de Recuperación
                </label>
                <input
                  type="text"
                  value={keypass}
                  onChange={(e) => setkeypass(e.target.value)}
                  className={inputClassName}
                  placeholder="Tu palabra secreta"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Repite tu nueva contraseña"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all"
              >
                Restablecer Contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Biwenger
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {loggedUsername.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{loggedUsername}</p>
                <p className="text-sm text-gray-600">Usuario</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentSection === "pronosticos"
                    ? "Bienvenido"
                    : menuItems.find((item) => item.id === currentSection)
                        ?.label}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=JTQ424L78W22U"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                title="Apoya este proyecto"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
                <span className="hidden sm:inline">Apoyar</span>
              </a>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                {loggedUsername.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {currentSection === "pronosticos" && (
            <div>
              {/* Header con info de premios */}
              <div className="mb-8 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2">
                    Biwenger
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl font-semibold mb-4 sm:mb-6 text-purple-100">
                    ¡Haz tus predicciones para esta jornada!
                  </p>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-white/20">
                    <h3 className="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
                      🏆 PREMIOS
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-white/10 rounded-xl p-3">
                        <span className="text-2xl sm:text-3xl">🎯</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm sm:text-base">
                            Acertar el resultado
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-yellow-300">
                          $1.000.000
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-white/10 rounded-xl p-3">
                        <span className="text-2xl sm:text-3xl">⚽</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm sm:text-base">
                            Acertar el primer goleador
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-yellow-300">
                          $500.000
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl p-3 shadow-lg">
                        <span className="text-2xl sm:text-3xl">💰</span>
                        <div className="flex-1">
                          <p className="font-black text-gray-900 text-sm sm:text-base">
                            Acertar ambas cosas
                          </p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900">
                          $2.000.000
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Jornada Actual
                </h2>
                <p className="text-gray-600">
                  Para hacer tus predicciones, pon tus marcadores y el primer
                  goleador en cada partido. Si ya habías enviado una predicción
                  y quieres modificarla, haz los cambios que consideres y
                  presiona en Guardar Pronósticos.
                </p>
              </div>

              {partidos.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 text-center">
                  <p className="text-gray-600">No hay partidos disponibles</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {partidos.map((partido) => {
                    const isExpired = countdown[partido.id]?.expirado || false;
                    const countdownText =
                      countdown[partido.id]?.texto || "Cargando...";
                    const pronostico = pronosticos[partido.id];
                    const temp = tempPronosticos[partido.id] || {};

                    const golesLocal =
                      temp.golesLocal ?? pronostico?.goleslocal ?? "";
                    const golesVisita =
                      temp.golesVisita ?? pronostico?.golesvisita ?? "";
                    const hayGoles =
                      (golesLocal && parseInt(golesLocal) > 0) ||
                      (golesVisita && parseInt(golesVisita) > 0);
                    const tienePronostico = !!pronostico;

                    // Verificar si hubo cambios en el pronóstico
                    const huboModificacion =
                      tienePronostico &&
                      ((temp.golesLocal !== undefined &&
                        temp.golesLocal !==
                          (pronostico.goleslocal?.toString() ?? "")) ||
                        (temp.golesVisita !== undefined &&
                          temp.golesVisita !==
                            (pronostico.golesvisita?.toString() ?? "")));

                    return (
                      <div
                        key={partido.id}
                        className={`bg-white rounded-2xl p-6 border-2 shadow-sm hover:shadow-lg transition-all ${
                          isExpired
                            ? "border-gray-300 opacity-75"
                            : "border-gray-100"
                        }`}
                      >
                        <div className="mb-4 pb-3 border-b-2 border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {partido.bandera && (
                                <img
                                  src={partido.bandera}
                                  alt="Bandera"
                                  className="w-6 h-4 object-cover rounded shadow-sm"
                                  onError={(e) =>
                                    ((
                                      e.target as HTMLImageElement
                                    ).style.display = "none")
                                  }
                                />
                              )}
                              <span className="text-xs font-bold text-gray-600 uppercase">
                                {new Date(partido.fechaHora).toLocaleDateString(
                                  "es-ES",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-500">
                              {new Date(partido.fechaHora).toLocaleTimeString(
                                "es-ES",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>

                          {isExpired ? (
                            <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 px-4 rounded-xl">
                              <div className="absolute inset-0 bg-black opacity-10"></div>
                              <div className="relative flex items-center justify-center gap-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="font-black text-sm tracking-wide">
                                  PRONÓSTICOS CERRADOS
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-20 blur-xl"></div>
                              <div className="relative bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 text-white py-3 px-4 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                                    ⏰ Cierra en
                                  </span>
                                  <svg
                                    className="w-4 h-4 animate-pulse"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <span className="text-2xl font-black tracking-tight">
                                    {countdownText}
                                  </span>
                                </div>
                                <div className="mt-1 text-center">
                                  <span className="text-xs font-semibold opacity-80">
                                    para enviar tu pronóstico
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-gray-100 mb-3">
                              {partido.escudoLocal ? (
                                <img
                                  src={partido.escudoLocal}
                                  alt={partido.equipoLocal}
                                  className="w-14 h-14 object-contain"
                                />
                              ) : (
                                <span className="text-gray-400 text-2xl font-bold">
                                  ?
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-gray-900 text-sm leading-tight mb-1">
                              {partido.equipoLocal}
                            </p>
                            <p className="text-xs text-gray-500">Local</p>
                          </div>

                          <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-gray-100 mb-3">
                              {partido.escudoVisitante ? (
                                <img
                                  src={partido.escudoVisitante}
                                  alt={partido.equipoVisitante}
                                  className="w-14 h-14 object-contain"
                                />
                              ) : (
                                <span className="text-gray-400 text-2xl font-bold">
                                  ?
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-gray-900 text-sm leading-tight mb-1">
                              {partido.equipoVisitante}
                            </p>
                            <p className="text-xs text-gray-500">Visitante</p>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl p-4 mb-4 ${
                            isExpired
                              ? "bg-gray-100"
                              : "bg-gradient-to-br from-purple-50 to-blue-50"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-4">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={golesLocal}
                              placeholder=""
                              disabled={isExpired}
                              className={`w-16 h-16 text-3xl font-bold text-center border-2 rounded-xl transition-all ${
                                isExpired
                                  ? "border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : "border-purple-300 bg-white text-purple-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              }`}
                              onChange={(e) => {
                                setTempPronosticos({
                                  ...tempPronosticos,
                                  [partido.id]: {
                                    ...tempPronosticos[partido.id],
                                    golesLocal: e.target.value,
                                  },
                                });
                              }}
                            />

                            <div className="text-3xl font-bold text-gray-400">
                              -
                            </div>

                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={golesVisita}
                              placeholder=""
                              disabled={isExpired}
                              className={`w-16 h-16 text-3xl font-bold text-center border-2 rounded-xl transition-all ${
                                isExpired
                                  ? "border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : "border-blue-300 bg-white text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              }`}
                              onChange={(e) => {
                                setTempPronosticos({
                                  ...tempPronosticos,
                                  [partido.id]: {
                                    ...tempPronosticos[partido.id],
                                    golesVisita: e.target.value,
                                  },
                                });
                              }}
                            />
                          </div>
                        </div>

                        {/* Selector de Goleador */}
                        {/* Selector de Goleador */}
                        {hayGoles && (
                          <div className="mb-4 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                                ⚽ Goleador
                              </p>
                              {!isExpired && (
                                <button
                                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                                  onClick={() => abrirModalGoleador(partido)}
                                >
                                  {pronostico?.nombregoleador
                                    ? "Cambiar"
                                    : "Añadir"}
                                </button>
                              )}
                            </div>

                            {/* Solo mostrar si hay un goleador seleccionado */}
                            {pronostico?.nombregoleador ? (
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-lg">
                                    {pronostico.fotogoleador ? (
                                      <img
                                        src={pronostico.fotogoleador}
                                        alt={pronostico.nombregoleador}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                          if (target.parentElement) {
                                            target.parentElement.innerHTML =
                                              "...";
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-lg">
                                        ?
                                      </div>
                                    )}
                                  </div>
                                  {pronostico.escudogoleador && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-amber-100">
                                      <img
                                        src={pronostico.escudogoleador}
                                        alt="Escudo"
                                        className="w-4 h-4 object-contain"
                                        onError={(e) =>
                                          ((
                                            e.target as HTMLImageElement
                                          ).style.display = "none")
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 leading-tight">
                                    {pronostico.nombregoleador}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-sm text-gray-500 italic">
                                  No has seleccionado un goleador
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {partidos.length > 0 && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl text-sm font-semibold max-w-md text-center">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 px-6 py-3 rounded-xl text-sm font-semibold max-w-md text-center">
                      {success}
                    </div>
                  )}

                  <button
                    onClick={guardarPronosticos}
                    disabled={loading}
                    className={`px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all text-lg ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Guardando..." : "Guardar Pronósticos"}
                  </button>
                </div>
              )}
            </div>
          )}

          {currentSection === "users" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
                <h1 className="text-3xl sm:text-4xl font-black mb-2">
                  Pronósticos de Usuarios
                </h1>
                <p className="text-base sm:text-lg text-purple-100">
                  Mira las predicciones de otros jugadores para esta jornada
                </p>
              </div>

              {loadingPronosticosUsuarios ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Cargando pronósticos...</div>
                </div>
              ) : pronosticosUsuariosReales.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 text-center">
                  <p className="text-gray-600">
                    No hay pronósticos disponibles
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pronosticosUsuariosReales.map((partido) => (
                    <div
                      key={partido.id}
                      className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden"
                    >
                      {/* Header del partido */}
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg sm:text-xl">
                                {partido.equipoLocal} vs{" "}
                                {partido.equipoVisitante}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {new Date(partido.fechaHora).toLocaleDateString(
                                  "es-ES",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}{" "}
                                -{" "}
                                {new Date(partido.fechaHora).toLocaleTimeString(
                                  "es-ES",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                              {partido.escudoLocal ? (
                                <img
                                  src={partido.escudoLocal}
                                  alt={partido.equipoLocal}
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                                />
                              ) : (
                                <span className="text-gray-400 text-xl">?</span>
                              )}
                            </div>
                            <span className="text-2xl font-bold text-gray-400">
                              vs
                            </span>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                              {partido.escudoVisitante ? (
                                <img
                                  src={partido.escudoVisitante}
                                  alt={partido.equipoVisitante}
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                                />
                              ) : (
                                <span className="text-gray-400 text-xl">?</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pronósticos de usuarios - Desktop */}
                      <div className="hidden lg:block p-6">
                        <div className="grid grid-cols-3 gap-4 mb-4 pb-3 border-b-2 border-gray-100">
                          <div className="font-bold text-gray-700 text-sm uppercase">
                            Usuario
                          </div>
                          <div className="font-bold text-gray-700 text-sm uppercase text-center">
                            Pronóstico
                          </div>
                          <div className="font-bold text-gray-700 text-sm uppercase text-center">
                            Goleador
                          </div>
                        </div>

                        {partido.pronosticos.map((pronostico: any) => (
                          <div
                            key={pronostico.id}
                            className="grid grid-cols-3 gap-4 items-center py-4 border-b border-gray-100 hover:bg-purple-50/50 transition-colors rounded-lg px-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                                {pronostico.usuario.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900">
                                {pronostico.usuario}
                              </span>
                            </div>

                            <div className="flex items-center justify-center gap-3">
                              <div className="bg-purple-100 text-purple-700 font-black text-2xl w-12 h-12 rounded-xl flex items-center justify-center border-2 border-purple-200">
                                {pronostico.golesLocal}
                              </div>
                              <span className="text-xl font-bold text-gray-400">
                                -
                              </span>
                              <div className="bg-blue-100 text-blue-700 font-black text-2xl w-12 h-12 rounded-xl flex items-center justify-center border-2 border-blue-200">
                                {pronostico.golesVisita}
                              </div>
                            </div>

                            <div className="flex justify-center">
                              {pronostico.goleador ? (
                                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200 max-w-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        {pronostico.goleador.foto ? (
                                          <img
                                            src={pronostico.goleador.foto}
                                            alt={pronostico.goleador.nombre}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold">
                                            ?
                                          </div>
                                        )}
                                      </div>
                                      {pronostico.goleador.escudo && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-100">
                                          <img
                                            src={pronostico.goleador.escudo}
                                            alt="Escudo"
                                            className="w-3 h-3 object-contain"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                                        {pronostico.goleador.nombre}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <p className="text-sm text-gray-500 italic">
                                    Sin goleador
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pronósticos de usuarios - Mobile */}
                      <div className="lg:hidden p-4 space-y-4">
                        {partido.pronosticos.map((pronostico: any) => (
                          <div
                            key={pronostico.id}
                            className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-100"
                          >
                            {/* Usuario y estado */}
                            {/* Usuario */}
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b-2 border-white">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                                {pronostico.usuario.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-900">
                                {pronostico.usuario}
                              </span>
                            </div>

                            {/* Pronóstico */}
                            <div className="mb-3">
                              <p className="text-xs font-bold text-gray-600 uppercase mb-2">
                                Pronóstico
                              </p>
                              <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-3 border-2 border-gray-100">
                                <div className="bg-purple-100 text-purple-700 font-black text-2xl w-14 h-14 rounded-xl flex items-center justify-center border-2 border-purple-200">
                                  {pronostico.golesLocal}
                                </div>
                                <span className="text-2xl font-bold text-gray-400">
                                  -
                                </span>
                                <div className="bg-blue-100 text-blue-700 font-black text-2xl w-14 h-14 rounded-xl flex items-center justify-center border-2 border-blue-200">
                                  {pronostico.golesVisita}
                                </div>
                              </div>
                            </div>

                            {/* Goleador */}
                            {pronostico.goleador ? (
                              <div>
                                <p className="text-xs font-bold text-gray-600 uppercase mb-2">
                                  Goleador
                                </p>
                                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200">
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                      <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-lg">
                                        {pronostico.goleador.foto ? (
                                          <img
                                            src={pronostico.goleador.foto}
                                            alt={pronostico.goleador.nombre}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-lg">
                                            ?
                                          </div>
                                        )}
                                      </div>
                                      {pronostico.goleador.escudo && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-amber-100">
                                          <img
                                            src={pronostico.goleador.escudo}
                                            alt="Escudo"
                                            className="w-4 h-4 object-contain"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 leading-tight">
                                        {pronostico.goleador.nombre}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-gray-600 uppercase mb-2">
                                  Goleador
                                </p>
                                <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200 text-center">
                                  <p className="text-sm text-gray-500 italic">
                                    Sin goleador
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentSection === "estadisticas" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
                <h1 className="text-3xl sm:text-4xl font-black mb-2">
                  Estadísticas
                </h1>
                <p className="text-base sm:text-lg text-purple-100">
                  Ranking de jugadores y sus predicciones acertadas
                </p>
              </div>

              {loadingEstadisticas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Cargando estadísticas...</div>
                </div>
              ) : estadisticasReales.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 text-center">
                  <p className="text-gray-600">
                    No hay estadísticas disponibles
                  </p>
                </div>
              ) : (
                <>
                  {/* Tabla de estadísticas - Desktop */}
                  <div className="hidden lg:block bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-50 to-blue-50">
                            <th className="px-6 py-4 text-left">
                              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Pos
                              </span>
                            </th>
                            <th className="px-6 py-4 text-left">
                              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Usuario
                              </span>
                            </th>
                            <th className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Trophy className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                  Resultados
                                </span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Goleadores
                              </span>
                            </th>
                            <th className="px-6 py-4 text-right">
                              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Total Ganado
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {estadisticasReales.map((usuario, index) => (
                            <React.Fragment key={usuario.id}>
                              <tr className="hover:bg-purple-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold text-lg">
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                      {usuario.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="font-bold text-gray-900 text-lg">
                                      {usuario.nombre}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                                      <span className="text-2xl font-black text-green-700">
                                        {usuario.resultadosAcertados}
                                      </span>
                                      <span className="text-sm font-semibold text-green-600">
                                        {usuario.resultadosAcertados === 1
                                          ? "partido"
                                          : "partidos"}
                                      </span>
                                    </div>
                                    {usuario.resultadosAcertados > 0 && (
                                      <button
                                        onClick={() =>
                                          toggleDetalles(
                                            usuario.id,
                                            "resultados"
                                          )
                                        }
                                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                                      >
                                        {detallesExpandidos[usuario.id]
                                          ?.resultados
                                          ? "Ocultar"
                                          : "Ver detalles"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center gap-2">
                                    <div
                                      className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                                        usuario.goleadoresAcertados > 0
                                          ? "bg-amber-100"
                                          : "bg-gray-100"
                                      }`}
                                    >
                                      <span
                                        className={`text-2xl font-black ${
                                          usuario.goleadoresAcertados > 0
                                            ? "text-amber-700"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {usuario.goleadoresAcertados}
                                      </span>
                                      <span
                                        className={`text-sm font-semibold ${
                                          usuario.goleadoresAcertados > 0
                                            ? "text-amber-600"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {usuario.goleadoresAcertados === 1
                                          ? "goleador"
                                          : "goleadores"}
                                      </span>
                                    </div>
                                    {usuario.goleadoresAcertados > 0 && (
                                      <button
                                        onClick={() =>
                                          toggleDetalles(
                                            usuario.id,
                                            "goleadores"
                                          )
                                        }
                                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                                      >
                                        {detallesExpandidos[usuario.id]
                                          ?.goleadores
                                          ? "Ocultar"
                                          : "Ver detalles"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-right">
                                    <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                      ${usuario.totalGanado.toLocaleString()}
                                    </p>
                                  </div>
                                </td>
                              </tr>

                              {/* Fila expandible de detalles */}
                              {(detallesExpandidos[usuario.id]?.resultados ||
                                detallesExpandidos[usuario.id]?.goleadores) && (
                                <tr>
                                  <td
                                    colSpan={5 as number}
                                    className="px-6 py-4 bg-purple-50/50"
                                  >
                                    {detallesExpandidos[usuario.id]
                                      ?.resultados && (
                                      <div className="mb-4">
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                          <Trophy className="w-5 h-5 text-green-600" />
                                          Resultados Acertados
                                        </h4>
                                        <div className="grid gap-2">
                                          {usuario.detalleResultados.map((resultado: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="bg-white rounded-lg p-3 border-2 border-green-200"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    {/* Escudos y nombres de equipos */}
                                                    <div className="flex items-center gap-2">
                                                      {resultado.escudoLocal && (
                                                        <img
                                                          src={
                                                            resultado.escudoLocal
                                                          }
                                                          alt=""
                                                          className="w-6 h-6 object-contain"
                                                          onError={(e) =>
                                                            ((
                                                              e.target as HTMLImageElement
                                                            ).style.display =
                                                              "none")
                                                          }
                                                        />
                                                      )}
                                                      <span className="font-semibold text-gray-900">
                                                        {resultado.equipoLocal}
                                                      </span>
                                                    </div>
                                                    <span className="text-gray-400 font-bold">
                                                      vs
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      {resultado.escudoVisitante && (
                                                        <img
                                                          src={
                                                            resultado.escudoVisitante
                                                          }
                                                          alt=""
                                                          className="w-6 h-6 object-contain"
                                                          onError={(e) =>
                                                            ((
                                                              e.target as HTMLImageElement
                                                            ).style.display =
                                                              "none")
                                                          }
                                                        />
                                                      )}
                                                      <span className="font-semibold text-gray-900">
                                                        {
                                                          resultado.equipoVisitante
                                                        }
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-green-700 font-bold text-lg">
                                                      {resultado.marcador}
                                                    </span>
                                                  </div>
                                                </div>
                                                <span className="text-xs text-gray-500 ml-8">
                                                  {resultado.fecha}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {detallesExpandidos[usuario.id]
                                      ?.goleadores && (
                                      <div>
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                          <span className="text-xl">⚽</span>
                                          Goleadores Acertados
                                        </h4>
                                        <div className="grid gap-2">
                                          {usuario.detalleGoleadores.map((goleador: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="bg-white rounded-lg p-3 border-2 border-amber-200"
                                              >
                                                <div className="flex items-center gap-3">
                                                  {/* Foto del goleador */}
                                                  <div className="relative flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-300 shadow-md">
                                                      {goleador.foto ? (
                                                        <img
                                                          src={goleador.foto}
                                                          alt={goleador.jugador}
                                                          className="w-full h-full object-cover"
                                                          onError={(e) => {
                                                            const target =
                                                              e.target as HTMLImageElement;
                                                            target.style.display =
                                                              "none";
                                                            if (
                                                              target.parentElement
                                                            ) {
                                                              target.parentElement.innerHTML =
                                                                '<div class="w-full h-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">' +
                                                                goleador.jugador.charAt(
                                                                  0
                                                                ) +
                                                                "</div>";
                                                            }
                                                          }}
                                                        />
                                                      ) : (
                                                        <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                                                          {goleador.jugador.charAt(
                                                            0
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                    {/* Escudo del equipo del goleador */}
                                                    {goleador.escudo && (
                                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-200">
                                                        <img
                                                          src={goleador.escudo}
                                                          alt=""
                                                          className="w-3 h-3 object-contain"
                                                          onError={(e) =>
                                                            ((
                                                              e.target as HTMLImageElement
                                                            ).style.display =
                                                              "none")
                                                          }
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">
                                                      {goleador.jugador}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                      {goleador.escudoLocal && (
                                                        <img
                                                          src={
                                                            goleador.escudoLocal
                                                          }
                                                          alt=""
                                                          className="w-4 h-4 object-contain"
                                                          onError={(e) =>
                                                            ((
                                                              e.target as HTMLImageElement
                                                            ).style.display =
                                                              "none")
                                                          }
                                                        />
                                                      )}
                                                      <p className="text-sm text-gray-600">
                                                        {goleador.partido}
                                                      </p>
                                                      {goleador.escudoVisitante && (
                                                        <img
                                                          src={
                                                            goleador.escudoVisitante
                                                          }
                                                          alt=""
                                                          className="w-4 h-4 object-contain"
                                                          onError={(e) =>
                                                            ((
                                                              e.target as HTMLImageElement
                                                            ).style.display =
                                                              "none")
                                                          }
                                                        />
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                      {goleador.fecha}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Cards para móvil */}
                  <div className="lg:hidden space-y-4">
                    {estadisticasReales.map((usuario, index) => (
                      <div
                        key={usuario.id}
                        className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden"
                      >
                        {/* Header de la card */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b-2 border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-lg truncate">
                                {usuario.nombre}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Contenido de la card */}
                        <div className="p-4 space-y-4">
                          {/* Resultados */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-purple-600" />
                                Resultados
                              </span>
                              <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                                <span className="text-xl font-black text-green-700">
                                  {usuario.resultadosAcertados}
                                </span>
                                <span className="text-xs font-semibold text-green-600">
                                  {usuario.resultadosAcertados === 1
                                    ? "partido"
                                    : "partidos"}
                                </span>
                              </div>
                            </div>
                            {usuario.resultadosAcertados > 0 && (
                              <button
                                onClick={() =>
                                  toggleDetalles(usuario.id, "resultados")
                                }
                                className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                              >
                                {detallesExpandidos[usuario.id]?.resultados
                                  ? "Ocultar detalles"
                                  : "Ver detalles"}
                              </button>
                            )}

                            {/* Detalles de resultados */}
                            {detallesExpandidos[usuario.id]?.resultados && (
                              <div className="mt-3 space-y-2">
                                {usuario.detalleResultados.map((resultado: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-green-50 rounded-lg p-3 border-2 border-green-200"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col gap-2 flex-1">
                                          <div className="flex items-center gap-2">
                                            {resultado.escudoLocal && (
                                              <img
                                                src={resultado.escudoLocal}
                                                alt=""
                                                className="w-5 h-5 object-contain"
                                                onError={(e) =>
                                                  ((
                                                    e.target as HTMLImageElement
                                                  ).style.display = "none")
                                                }
                                              />
                                            )}
                                            <span className="font-semibold text-gray-900 text-sm">
                                              {resultado.equipoLocal}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {resultado.escudoVisitante && (
                                              <img
                                                src={resultado.escudoVisitante}
                                                alt=""
                                                className="w-5 h-5 object-contain"
                                                onError={(e) =>
                                                  ((
                                                    e.target as HTMLImageElement
                                                  ).style.display = "none")
                                                }
                                              />
                                            )}
                                            <span className="font-semibold text-gray-900 text-sm">
                                              {resultado.equipoVisitante}
                                            </span>
                                          </div>
                                        </div>
                                        <span className="text-green-700 font-bold text-lg">
                                          {resultado.marcador}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {resultado.fecha}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {/* Goleadores */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2">
                                <span>⚽</span>
                                Goleadores
                              </span>
                              <div
                                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                                  usuario.goleadoresAcertados > 0
                                    ? "bg-amber-100"
                                    : "bg-gray-100"
                                }`}
                              >
                                <span
                                  className={`text-xl font-black ${
                                    usuario.goleadoresAcertados > 0
                                      ? "text-amber-700"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {usuario.goleadoresAcertados}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    usuario.goleadoresAcertados > 0
                                      ? "text-amber-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {usuario.goleadoresAcertados === 1
                                    ? "goleador"
                                    : "goleadores"}
                                </span>
                              </div>
                            </div>
                            {usuario.goleadoresAcertados > 0 && (
                              <button
                                onClick={() =>
                                  toggleDetalles(usuario.id, "goleadores")
                                }
                                className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                              >
                                {detallesExpandidos[usuario.id]?.goleadores
                                  ? "Ocultar detalles"
                                  : "Ver detalles"}
                              </button>
                            )}

                            {/* Detalles de goleadores */}
                            {detallesExpandidos[usuario.id]?.goleadores && (
                              <div className="mt-3 space-y-2">
                                {usuario.detalleGoleadores.map((goleador: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-amber-50 rounded-lg p-3 border-2 border-amber-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-300 shadow-md">
                                            {goleador.foto ? (
                                              <img
                                                src={goleador.foto}
                                                alt={goleador.jugador}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  const target =
                                                    e.target as HTMLImageElement;
                                                  target.style.display = "none";
                                                  if (target.parentElement) {
                                                    target.parentElement.innerHTML =
                                                      '<div class="w-full h-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">' +
                                                      goleador.jugador.charAt(
                                                        0
                                                      ) +
                                                      "</div>";
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                                                {goleador.jugador.charAt(0)}
                                              </div>
                                            )}
                                          </div>
                                          {goleador.escudo && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-200">
                                              <img
                                                src={goleador.escudo}
                                                alt=""
                                                className="w-3 h-3 object-contain"
                                                onError={(e) =>
                                                  ((
                                                    e.target as HTMLImageElement
                                                  ).style.display = "none")
                                                }
                                              />
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-gray-900 text-sm">
                                            {goleador.jugador}
                                          </p>
                                          <div className="flex items-center gap-1 mt-1">
                                            {goleador.escudoLocal && (
                                              <img
                                                src={goleador.escudoLocal}
                                                alt=""
                                                className="w-4 h-4 object-contain"
                                                onError={(e) =>
                                                  ((
                                                    e.target as HTMLImageElement
                                                  ).style.display = "none")
                                                }
                                              />
                                            )}
                                            <p className="text-xs text-gray-600 truncate">
                                              {goleador.partido}
                                            </p>
                                            {goleador.escudoVisitante && (
                                              <img
                                                src={goleador.escudoVisitante}
                                                alt=""
                                                className="w-4 h-4 object-contain"
                                                onError={(e) =>
                                                  ((
                                                    e.target as HTMLImageElement
                                                  ).style.display = "none")
                                                }
                                              />
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {goleador.fecha}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {/* Total ganado */}
                          <div className="pt-3 border-t-2 border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-600 uppercase">
                                Total Ganado
                              </span>
                              <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                ${usuario.totalGanado.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showGoleadorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Seleccionar Goleador
                </h2>
                <button
                  onClick={() => {
                    setShowGoleadorModal(false);
                    setBusquedaGoleador("");
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {partidoSeleccionado && (
                <p className="text-sm text-gray-600 mb-4">
                  {partidoSeleccionado.equipoLocal} vs{" "}
                  {partidoSeleccionado.equipoVisitante}
                </p>
              )}

              {/* Barra de búsqueda */}
              <div className="relative">
                <input
                  type="text"
                  value={busquedaGoleador}
                  onChange={(e) => setBusquedaGoleador(e.target.value)}
                  placeholder="Buscar jugador por nombre..."
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-gray-900 font-medium placeholder:text-gray-500"
                  autoFocus
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Cargando jugadores...</div>
                </div>
              ) : jugadoresFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="font-medium">
                    {busquedaGoleador
                      ? "No se encontraron jugadores con ese nombre"
                      : "No hay jugadores disponibles"}
                  </p>
                  {busquedaGoleador && (
                    <p className="text-sm mt-2">
                      Intenta con otro término de búsqueda
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {jugadoresFiltrados.map((jugador) => (
                    <button
                      key={jugador.id}
                      onClick={() => {
                        seleccionarGoleador(jugador);
                        setBusquedaGoleador("");
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                          {jugador.foto ? (
                            <img
                              src={jugador.foto}
                              alt={jugador.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                if (target.parentElement) {
                                  target.parentElement.innerHTML =
                                    '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">?</div>';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                              ?
                            </div>
                          )}
                        </div>
                        {jugador.escudo_equipo && (
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-gray-200">
                            <img
                              src={jugador.escudo_equipo}
                              alt={jugador.nombre_equipo}
                              className="w-5 h-5 object-contain"
                              onError={(e) =>
                                ((e.target as HTMLImageElement).style.display =
                                  "none")
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">
                          {jugador.nombre}
                        </p>
                        <p className="text-sm text-gray-600">
                          {jugador.nombre_equipo}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

# B4OS Master Dashboard

Dashboard administrativo para el programa Bitcoin 4 Open Source (B4OS) que permite monitorear el progreso de los estudiantes en sus assignments de GitHub Classroom.

## Características

- **Dashboard en tiempo real** con estadísticas de estudiantes
- **Sistema de autenticación** con GitHub OAuth
- **Ranking dinámico** basado en tiempo de resolución
- **Filtros avanzados** para análisis de datos
- **Tooltips informativos** con actividad de GitHub
- **Vista responsive** para desktop y móvil
- **Sincronización automática** con GitHub Classroom

## Estructura del Proyecto

```
b4os-admin/
├── b4os-frontend/          # Aplicación Next.js
│   ├── src/
│   │   ├── app/            # Páginas principales
│   │   ├── components/     # Componentes React
│   │   └── lib/           # Utilidades y servicios
│   ├── public/            # Assets estáticos
│   └── package.json       # Dependencias del frontend
├── b4os-backend/          # Scripts de Python
│   ├── src/lib/           # Lógica de sincronización
│   ├── requirements.txt   # Dependencias de Python
│   └── README.md         # Documentación del backend
└── README.md             # Este archivo
```

## Tecnologías

### Frontend
- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **NextAuth.js** - Autenticación
- **Supabase** - Base de datos
- **Lucide React** - Iconos

### Backend
- **Python 3.8+** - Lenguaje principal
- **Supabase-py** - Cliente de base de datos
- **GitHub CLI** - Integración con GitHub
- **Requests** - Cliente HTTP

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Python 3.8+
- Cuenta de GitHub
- Proyecto de Supabase

### Frontend
```bash
cd b4os-frontend
npm install
cp env.example .env.local
# Configurar variables de entorno en .env.local
npm run dev
```

### Backend
```bash
cd b4os-backend
pip install -r requirements.txt
cp env.example .env.local
# Configurar variables de entorno en .env.local
python sync-classroom.py
```

## ⚙️ Variables de Entorno

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GITHUB_ID=your_github_oauth_id
GITHUB_SECRET=your_github_oauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Backend (.env.local)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
GITHUB_TOKEN=your_github_token
CLASSROOM_NAME=your_classroom_name
```

## Funcionalidades

### Dashboard Principal
- **Estadísticas generales**: Total de estudiantes, assignments, puntuación promedio
- **Tabla de ranking**: Ordenada por tiempo de resolución
- **Filtros dinámicos**: Por estado, tiempo, porcentaje
- **Ordenamiento**: Por columnas individuales

### Sistema de Autenticación
- **Login con GitHub**: OAuth 2.0
- **Control de acceso**: Solo usuarios autorizados
- **Roles de usuario**: Admin, estudiante

### Sincronización de Datos
- **GitHub Classroom**: Obtiene assignments y estudiantes
- **Calificaciones**: Sincroniza puntuaciones
- **Tiempo de resolución**: Calcula tiempo desde fork hasta completado
- **Estado de fork**: Detecta si el estudiante hizo fork

## Uso

### Sincronización Manual
```bash
cd b4os-backend
python sync-classroom.py
```

### Desarrollo
```bash
# Frontend
cd b4os-frontend
npm run dev

# Backend (en otra terminal)
cd b4os-backend
python sync-classroom.py
```

## Monitoreo

El dashboard muestra:
- **Progreso individual** de cada estudiante
- **Tiempo de resolución** de assignments
- **Actividad reciente** en GitHub
- **Estadísticas comparativas**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Programa**: Bitcoin 4 Open Source (B4OS)

## 📞 Soporte

Para soporte, contacta a [kleysc](https://github.com/kleysc) o abre un issue en este repositorio.

---

**B4OS Master Dashboard** - Monitoreo inteligente para el programa Bitcoin 4 Open Source
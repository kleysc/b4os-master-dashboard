"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SupabaseService, type Assignment } from "@/lib/supabase";
import UserProfile from "@/components/UserProfile";
import ProtectedContent from "@/components/ProtectedContent";
import GitHubTooltip from "@/components/GitHubTooltip";
import {
  UsersIcon,
  BookOpenIcon,
  TrophyIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  GithubIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import GitHubActionsModal from "@/components/GitHubActionsModal";
import GradesBreakdown from "@/components/GradesBreakdown";
import DashboardFilters, { FilterState } from "@/components/DashboardFilters";

export default function Home() {
  const [stats, setStats] = useState<{
    totalStudents?: number;
    totalAssignments?: number;
    avgScore?: number;
    completionRate?: number;
  }>({});
  const [leaderboard, setLeaderboard] = useState<
    Array<{
      github_username: string;
      assignments_completed: number;
      resolution_time_hours?: number;
      total_score: number;
      total_possible: number;
      percentage: number;
      has_fork?: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    username: string;
    assignmentName: string;
  } | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set()
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [filteredStudents, setFilteredStudents] = useState<
    Array<{
      github_username: string;
      assignments_completed: number;
      resolution_time_hours?: number;
      total_score: number;
      total_possible: number;
      percentage: number;
      has_fork?: boolean;
    }>
  >([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, leaderboardData, statsData] = await Promise.all([
        SupabaseService.getAssignments(),
        SupabaseService.getLeaderboard(),
        SupabaseService.getStudentStats(),
      ]);

      setAssignments(assignmentsData);
      setLeaderboard(leaderboardData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const applyFilters = (
    students: Array<{
      github_username: string;
      assignments_completed: number;
      resolution_time_hours?: number;
      total_score: number;
      total_possible: number;
      percentage: number;
      has_fork?: boolean;
    }>,
    filters: FilterState
  ): Array<{
    github_username: string;
    assignments_completed: number;
    resolution_time_hours?: number;
    total_score: number;
    total_possible: number;
    percentage: number;
    has_fork?: boolean;
  }> => {
    let filtered = [...students];

    // Aplicar búsqueda por nombre de usuario
    if (filters.searchTerm) {
      filtered = filtered.filter((student) =>
        student.github_username
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase())
      );
    }

    // Aplicar filtro de estado
    if (filters.showOnly !== "all") {
      filtered = filtered.filter((student) => {
        switch (filters.showOnly) {
          case "completed":
            return student.percentage === 100;
          case "partial":
            return student.percentage > 0 && student.percentage < 100;
          case "incomplete":
            return student.percentage === 0;
          default:
            return true;
        }
      });
    }

    // Aplicar filtro de rango de tiempo
    filtered = filtered.filter((student) => {
      if (
        student.resolution_time_hours === null ||
        student.resolution_time_hours === undefined
      )
        return true;
      return (
        student.resolution_time_hours >= filters.timeRange.min &&
        student.resolution_time_hours <= filters.timeRange.max
      );
    });

    // Aplicar filtro de rango de porcentaje
    filtered = filtered.filter(
      (student) =>
        student.percentage >= filters.percentageRange.min &&
        student.percentage <= filters.percentageRange.max
    );

    // Aplicar ordenamiento desde sortConfig (prioridad) o desde filters
    const sortBy = sortConfig.key || filters.sortBy;
    const sortOrder = sortConfig.direction || filters.sortOrder;

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "username":
          comparison = a.github_username.localeCompare(b.github_username);
          break;
        case "resolution_time":
          const timeA = a.resolution_time_hours ?? 999999;
          const timeB = b.resolution_time_hours ?? 999999;
          comparison = timeA - timeB;
          break;
        case "percentage":
          comparison = a.percentage - b.percentage;
          break;
        case "assignments":
          comparison = a.assignments_completed - b.assignments_completed;
          break;
        case "total_score":
          comparison = a.total_score - b.total_score;
          break;
        case "total_possible":
          comparison = a.total_possible - b.total_possible;
          break;
        default:
          // Por defecto, ordenar alfabéticamente
          comparison = a.github_username.localeCompare(b.github_username);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (leaderboard.length > 0) {
      const filtered = applyFilters(leaderboard, newFilters);
      setFilteredStudents(filtered);
    }
  };

  // Aplicar filtros cuando cambien los estudiantes
  useEffect(() => {
    if (leaderboard.length > 0) {
      if (filters) {
        const filtered = applyFilters(leaderboard, filters);
        setFilteredStudents(filtered);
      } else {
        // Ordenar alfabéticamente por defecto cuando no hay filtros
        const sorted = [...leaderboard].sort((a, b) =>
          a.github_username.localeCompare(b.github_username)
        );
        setFilteredStudents(sorted);
      }
    }
  }, [leaderboard, filters, sortConfig]);

  const openActionsModal = (username: string, assignmentName: string) => {
    setSelectedStudent({ username, assignmentName });
    setModalOpen(true);
  };

  const closeActionsModal = () => {
    setModalOpen(false);
    setSelectedStudent(null);
  };

  const toggleStudentGrades = (username: string) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shadow-lg">
                    <Image
                      src="/web-app-manifest-192x192.png"
                      alt="B4OS Logo"
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      B4OS Dashboard
                    </h1>
                    <p className="text-orange-300 text-sm font-medium">
                      Programa Bitcoin 4 Open Source
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <UserProfile />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
              <div className="flex justify-center mb-3">
                <UsersIcon className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.totalStudents || 0}
              </div>
              <div className="text-gray-300">Estudiantes</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
              <div className="flex justify-center mb-3">
                <BookOpenIcon className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.totalAssignments || 0}
              </div>
              <div className="text-gray-300">Assignments</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
              <div className="flex justify-center mb-3">
                <TrophyIcon className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.avgScore || 0}%
              </div>
              <div className="text-gray-300">Puntuación Promedio</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
              <div className="flex justify-center mb-3">
                <TrendingUpIcon className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.completionRate || 0}%
              </div>
              <div className="text-gray-300">Tasa de Finalización</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="container mx-auto px-6 py-4">
          <DashboardFilters
            onFiltersChange={handleFiltersChange}
            totalStudents={leaderboard.length}
            filteredCount={filteredStudents.length}
          />
        </section>

        {/* Leaderboard Section */}
        <section className="container mx-auto px-6 py-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <TrophyIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-2xl font-bold text-gray-900">
                  Ranking de Estudiantes
                </h3>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <UsersIcon className="w-4 h-4" />
                {filteredStudents.length > 0
                  ? filteredStudents.length
                  : leaderboard.length}{" "}
                estudiantes
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCwIcon className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            ) : (filteredStudents.length > 0 ? filteredStudents : leaderboard)
                .length === 0 ? (
              <div className="text-center py-12">
                <TrophyIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No hay datos disponibles</p>
                <p className="text-sm text-gray-500">
                  Los datos aparecerán cuando se sincronicen desde GitHub
                  Classroom
                </p>
              </div>
            ) : (
              <>
                {/* Tabla con scroll horizontal en móviles */}
                <div className="overflow-x-auto">
                  {/* Header de columnas */}
                  <div className="hidden md:grid grid-cols-12 items-center px-6 py-4 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700 mb-3">
                    <div className="col-span-1"></div> {/* Avatar */}
                    <div
                      className="col-span-3 text-left cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors flex items-center gap-1"
                      onClick={() => handleSort("username")}
                    >
                      Estudiantes
                      {sortConfig.key === "username" && (
                        <span className="text-orange-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    <div
                      className="col-span-2 text-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors flex items-center justify-center gap-1"
                      onClick={() => handleSort("assignments")}
                    >
                      Assignments
                      {sortConfig.key === "assignments" && (
                        <span className="text-orange-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    <div
                      className="col-span-2 text-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors flex items-center justify-center gap-1"
                      onClick={() => handleSort("resolution_time")}
                    >
                      Tiempo
                      {sortConfig.key === "resolution_time" && (
                        <span className="text-orange-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    <div
                      className="col-span-2 text-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors flex items-center justify-center gap-1"
                      onClick={() => handleSort("total_score")}
                    >
                      Puntos
                      {sortConfig.key === "total_score" && (
                        <span className="text-orange-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    <div
                      className="col-span-2 text-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors flex items-center justify-center gap-1"
                      onClick={() => handleSort("percentage")}
                    >
                      Porcentaje
                      {sortConfig.key === "percentage" && (
                        <span className="text-orange-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {(filteredStudents.length > 0
                      ? filteredStudents
                      : leaderboard
                    ).map((student, index) => {
                      // Generar colores únicos para cada estudiante
                      const colors = [
                        "bg-pink-500",
                        "bg-blue-500",
                        "bg-teal-500",
                        "bg-purple-500",
                        "bg-indigo-500",
                        "bg-cyan-500",
                        "bg-emerald-500",
                        "bg-rose-500",
                        "bg-amber-500",
                        "bg-lime-500",
                        "bg-orange-500",
                        "bg-violet-500",
                      ];
                      const colorClass = colors[index % colors.length];

                      return (
                        <div
                          key={student.github_username}
                          className="bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200"
                        >
                          {/* Vista desktop */}
                          <div className="hidden md:grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                            {/* Avatar de GitHub */}
                            <div className="col-span-1 flex justify-center">
                              <img
                                src={`https://github.com/${student.github_username}.png`}
                                alt={`${student.github_username} avatar`}
                                className="w-11 h-11 rounded-full shadow-sm border-2 border-gray-200 hover:border-orange-300 transition-colors duration-200"
                                onError={(e) => {
                                  // Fallback a círculo con inicial si la imagen falla
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback =
                                    target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                              <div
                                className={`w-11 h-11 ${colorClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm hidden`}
                              >
                                {student.github_username
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            </div>

                            {/* Estudiante */}
                            <div className="col-span-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://github.com/${student.github_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate text-sm transition-colors"
                                  >
                                    {student.github_username}
                                    <GithubIcon className="w-3 h-3 flex-shrink-0" />
                                  </a>
                                  {/* Activity Status Indicator */}
                                  {student.has_fork ? (
                                    <div 
                                      className="flex items-center gap-1 px-2 py-0.5 text-green-700 rounded-full text-xs font-medium cursor-help group relative"
                                      title="Usuario Activo - Ha realizado fork de los assignments"
                                    >
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-white text-gray-900 text-sm rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-48">
                                        <div className="text-sm font-medium text-gray-900">Usuario Activo</div>
                                        <div className="text-xs text-gray-600 mt-1">Ha realizado fork de los assignments</div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="flex items-center gap-1 px-2 py-0.5 text-gray-600 rounded-full text-xs font-medium cursor-help group relative"
                                      title="Usuario Inactivo - No ha realizado fork de los assignments"
                                    >
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-white text-gray-900 text-sm rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-48">
                                        <div className="text-sm font-medium text-gray-900">Usuario Inactivo</div>
                                        <div className="text-xs text-gray-600 mt-1">No ha realizado fork de los assignments</div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                                      </div>
                                    </div>
                                  )}
                                  <GitHubTooltip
                                    username={student.github_username}
                                    index={index}
                                  >
                                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 hover:bg-gray-200 hover:border-gray-400 rounded-full flex items-center justify-center cursor-pointer transition-colors group">
                                      <svg
                                        className="w-2.5 h-2.5 text-gray-600 group-hover:text-gray-700"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  </GitHubTooltip>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      toggleStudentGrades(
                                        student.github_username
                                      )
                                    }
                                    className="px-3 py-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full flex items-center gap-1 cursor-pointer transition-colors group text-xs"
                                    title={
                                      expandedStudents.has(
                                        student.github_username
                                      )
                                        ? "Ocultar desglose de calificaciones"
                                        : "Ver desglose de calificaciones"
                                    }
                                  >
                                    {expandedStudents.has(
                                      student.github_username
                                    ) ? (
                                      <ChevronUp className="w-3 h-3 text-gray-500 group-hover:text-blue-600" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-blue-600" />
                                    )}
                                    <span className="text-gray-500 group-hover:text-blue-600">
                                      Ver progreso
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Challenge */}
                            <div className="col-span-2 text-center">
                              <div className="text-sm text-gray-600">
                                {student.assignments_completed} de{" "}
                                {assignments.length}
                              </div>
                            </div>

                            {/* Tiempo de Resolución */}
                            <div className="col-span-2 text-center">
                              <div className="text-sm text-gray-700 font-medium">
                                {student.resolution_time_hours !== null &&
                                student.resolution_time_hours !== undefined ? (
                                  <span className="text-orange-600 font-semibold">
                                    {Math.floor(
                                      student.resolution_time_hours / 24
                                    )}
                                    d {student.resolution_time_hours % 24}h
                                  </span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </div>
                            </div>

                            {/* Puntos Obtenidos */}
                            <div className="col-span-2 text-center">
                              <div className="text-sm text-gray-700 font-semibold">
                                {student.total_score || 0}
                              </div>
                            </div>

                            {/* Porcentaje */}
                            <div className="col-span-2 text-center">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      student.percentage >= 80
                                        ? "bg-green-500"
                                        : student.percentage >= 60
                                        ? "bg-yellow-500"
                                        : student.percentage >= 40
                                        ? "bg-orange-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        student.percentage || 0,
                                        100
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    student.percentage >= 80
                                      ? "bg-green-100 text-green-800"
                                      : student.percentage >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : student.percentage >= 40
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {student.percentage || 0}%
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Vista móvil */}
                          <div className="md:hidden p-4">
                            <div className="flex items-center gap-3 mb-3">
                              {/* Avatar de GitHub */}
                              <img
                                src={`https://github.com/${student.github_username}.png`}
                                alt={`${student.github_username} avatar`}
                                className="w-12 h-12 rounded-full shadow-sm border-2 border-gray-200"
                                onError={(e) => {
                                  // Fallback a círculo con inicial si la imagen falla
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback =
                                    target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                              <div
                                className={`w-12 h-12 ${colorClass} rounded-full flex items-center justify-center text-white font-bold text-lg hidden`}
                              >
                                {student.github_username
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              {/* Información del estudiante */}
                              <div className="flex-1 min-w-0">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                     <a
                                       href={`https://github.com/${student.github_username}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate text-lg transition-colors"
                                     >
                                       <GithubIcon className="w-4 h-4 flex-shrink-0" />
                                       {student.github_username}
                                     </a>
                                     {/* Activity Status Indicator - Mobile */}
                                     {student.has_fork ? (
                                       <div 
                                         className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium cursor-help group relative"
                                         title="Usuario Activo - Ha realizado fork de los assignments"
                                       >
                                         <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                         Activo
                                         {/* Tooltip */}
                                         <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-white text-gray-900 text-sm rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-48">
                                           <div className="text-sm font-medium text-gray-900">Usuario Activo</div>
                                           <div className="text-xs text-gray-600 mt-1">Ha realizado fork de los assignments</div>
                                           <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                                         </div>
                                       </div>
                                     ) : (
                                       <div 
                                         className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium cursor-help group relative"
                                         title="Usuario Inactivo - No ha realizado fork de los assignments"
                                       >
                                         <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                         Inactivo
                                         {/* Tooltip */}
                                         <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-white text-gray-900 text-sm rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-48">
                                           <div className="text-sm font-medium text-gray-900">Usuario Inactivo</div>
                                           <div className="text-xs text-gray-600 mt-1">No ha realizado fork de los assignments</div>
                                           <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
                                         </div>
                                       </div>
                                     )}
                                    <GitHubTooltip
                                      username={student.github_username}
                                      index={index}
                                    >
                                      <div className="w-5 h-5 bg-gray-100 border border-gray-300 hover:bg-gray-200 hover:border-gray-400 rounded-full flex items-center justify-center cursor-pointer transition-colors group">
                                        <svg
                                          className="w-3 h-3 text-gray-600 group-hover:text-gray-700"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                    </GitHubTooltip>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        toggleStudentGrades(
                                          student.github_username
                                        )
                                      }
                                      className="px-3 py-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full flex items-center gap-1 cursor-pointer transition-colors group text-sm"
                                      title={
                                        expandedStudents.has(
                                          student.github_username
                                        )
                                          ? "Ocultar desglose de calificaciones"
                                          : "Ver desglose de calificaciones"
                                      }
                                    >
                                      {expandedStudents.has(
                                        student.github_username
                                      ) ? (
                                        <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                                      )}
                                      <span className="text-gray-500 group-hover:text-blue-600">
                                        Ver progreso
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        openActionsModal(
                                          student.github_username,
                                          assignments[0]?.name || "assignment"
                                        )
                                      }
                                      className="px-3 py-1 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-full flex items-center gap-1 cursor-pointer transition-colors group text-sm"
                                      title="Ver ejecuciones de GitHub Actions"
                                    >
                                      <span className="text-gray-500 group-hover:text-orange-600">
                                        Actions
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Porcentaje */}
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  student.percentage >= 80
                                    ? "bg-green-100 text-green-700"
                                    : student.percentage >= 60
                                    ? "bg-yellow-100 text-yellow-700"
                                    : student.percentage >= 40
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {student.percentage || 0}%
                              </div>
                            </div>

                            {/* Barra de progreso y puntuación */}
                            <div className="space-y-2">
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    student.percentage >= 80
                                      ? "bg-green-500"
                                      : student.percentage >= 60
                                      ? "bg-yellow-500"
                                      : student.percentage >= 40
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      student.percentage || 0,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>

                              <div className="flex justify-between text-sm text-gray-600">
                                <span>
                                  {student.total_score || 0}/
                                  {student.total_possible || 0} puntos
                                </span>
                                <span className="text-xs text-gray-400">
                                  {student.assignments_completed} de{" "}
                                  {assignments.length} assignments
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Grades Breakdown Toggle */}
                          <GradesBreakdown
                            username={student.github_username}
                            isExpanded={expandedStudents.has(
                              student.github_username
                            )}
                            onOpenActions={openActionsModal}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white/5 backdrop-blur-sm text-gray-300 border-t border-white/10 mt-16">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center">
              <p className="mb-2 font-medium">B4OS Dashboard</p>
              <p className="text-sm text-gray-400">
                Monitoreo en tiempo real del programa Bitcoin 4 Open Source
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* GitHub Actions Modal */}
      {selectedStudent && (
        <GitHubActionsModal
          isOpen={modalOpen}
          onClose={closeActionsModal}
          username={selectedStudent.username}
          assignmentName={selectedStudent.assignmentName}
        />
      )}
    </ProtectedContent>
  );
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLinkIcon, GitBranchIcon, BookOpenIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, ClockIcon, PlayCircleIcon, ChevronDownIcon, ChevronUpIcon, AlertTriangleIcon } from 'lucide-react'

interface TestFailure {
  jobName: string
  jobId: number
  logs: string
  htmlUrl: string
}

interface AutogradingResult {
  hasWorkflows: boolean
  lastRun?: {
    id: number
    status: string
    conclusion: string | null
    created_at: string
    html_url: string
    passed: boolean
    score?: number
    failures?: TestFailure[]
  }
  totalRuns: number
}

interface GitHubData {
  success: boolean
  user?: {
    name: string
    githubUsername: string
    githubId: string
  }
  templateRepository?: {
    url: string
    info: any
    hasAccess: boolean
  }
  content?: {
    readme: string
    htmlUrl: string
    lastModified?: string
  }
  classroom?: {
    assignmentSlug: string
    inviteLink: string
  }
  studentRepository?: {
    exists: boolean
    url: string
    hasAccess: boolean
  }
  autograding?: AutogradingResult | null
  error?: string
}

interface GitHubIntegrationProps {
  templateRepository: string
  assignmentSlug: string
  fallbackContent?: string
  challenge?: any // Add challenge prop to access story and content
}

export default function GitHubIntegration({ 
  templateRepository, 
  assignmentSlug, 
  fallbackContent,
  challenge
}: GitHubIntegrationProps) {
  const { data: session } = useSession()
  const [githubData, setGithubData] = useState<GitHubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validatingRepository, setValidatingRepository] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({})
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000
  const CACHE_KEY = `github-data-${templateRepository}-${assignmentSlug}`
  const CACHE_TIMESTAMP_KEY = `github-timestamp-${templateRepository}-${assignmentSlug}`

  // Toggle log expansion
  const toggleLogExpansion = (jobId: number) => {
    setExpandedLogs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }))
  }

  // Clean and format logs for display
  const formatLogs = (logs: string): string => {
    return logs
      .split('\n')
      .filter(line => {
        // Filter out timestamp prefixes and irrelevant lines
        const cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s/, '')
        return cleanLine.trim() && 
               !cleanLine.startsWith('##[') && 
               !cleanLine.includes('runner.os') &&
               !cleanLine.includes('shell: /usr/bin/bash')
      })
      .map(line => line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s/, ''))
      .join('\n')
      .trim()
  }

  // Extract relevant error information from logs
  const extractErrorSummary = (logs: string): string => {
    const lines = logs.split('\n')
    const errorLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('FAILED') || 
          line.includes('Error') || 
          line.includes('Expected') ||
          line.includes('AssertionError') ||
          line.toLowerCase().includes('test') && line.toLowerCase().includes('fail')) {
        errorLines.push(line.trim())
        // Include next few lines for context
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          if (lines[j].trim() && !lines[j].includes('##[')) {
            errorLines.push(lines[j].trim())
          }
        }
        break
      }
    }
    
    return errorLines.length > 0 ? errorLines.join('\n') : 'No specific error details found'
  }

  // Return the original repository README content exactly as it is
  const getOriginalReadme = () => {
    return `# Programming Puzzle Party

¡Bienvenido a la Fiesta de Rompecabezas de Programación! Aquí tienes una lista de emocionantes desafíos de programación con temática de Bitcoin y Lightning Network. ¡Prepárate para resolver algunos rompecabezas mientras disfrutas de la fiesta de programación!

## Desafíos

1. **[Sudoku de Satoshi](sodoku.md)**: Embárcate en el viaje del "Sudoku de Satoshi", un giro en el querido rompecabezas Sudoku, donde los números del 1 al 9 son tus compañeros junto con hashes precalculados. Para conquistar este desafío, convoca tu destreza para resolver Sudoku, entrelazando algoritmos con lógica personalizada para navegar a través de los enigmáticos hashes y revelar los patrones ocultos.

2. **[Mochila del Minero](knapsack.md)**: Sumérgete en el Desafío de la Mochila del Minero, fusionando la minería de blockchain con la optimización de la mochila. Tu misión: crear un algoritmo para maximizar las tarifas de transacción dentro del límite de tamaño de un bloque. Aprovecha tus habilidades de codificación para seleccionar de manera óptima transacciones, equilibrando tarifas y espacio de bloque de manera eficiente.

3. **[Enrutamiento Lightning](routing.md)**: Implementa un sistema ingenuo para encontrar la ruta más corta y eficiente entre nodos en una red de canales de pago. Demuestra tus habilidades de programación y descubre la mejor manera de navegar entre nodos.

## Recomendaciones:

- Revisa cuidadosamente las secciones que detallan 'Tareas a realizar' o 'Preguntas', ya que estas indicarán las respuestas que serán evaluadas.
- Presta especial atención a los criterios de evaluación proporcionados para cada desafío, asegurándote de abordar todos los aspectos solicitados en tus soluciones.
- Ten en cuenta que la revisión de código se llevará a cabo a través de Autograder, por lo que es importante seguir estrictamente las instrucciones sobre dónde y cómo colocar los archivos de envío.
- No dudes en comunicarte en nuestro [canal de Discord](https://discord.com/channels/931311835121066004/1234230490026741801) si tienes alguna pregunta o necesitas más orientación.

## Proceso de desarrollo y evaluación de ejercicios

Bienvenido al proceso de desarrollo y evaluación para ejercicios. Queremos asegurarnos de que tengas una experiencia fluida y efectiva mientras trabajas en los desafíos propuestos. Así es como funciona:

1. **Desarrollo del ejercicio**: Puedes desarrollar tus soluciones y hacer commits en tu repositorio en cualquier momento. Siéntete libre de hacer tantos commits como necesites para guardar tu progreso y ejecutar pruebas.

2. **Evaluación preliminar con Autograder**: Cada vez que hagas un commit en tu repositorio, GitHub Classroom con Autograder realizará una evaluación preliminar de tus respuestas. Esto te proporcionará comentarios instantáneos sobre la corrección de tus soluciones.

3. **Revisión manual de código**: Después de que hayas completado y enviado tus respuestas, el equipo de B4OS realizará una revisión manual de código. Esta revisión garantiza una evaluación completa y precisa de tus soluciones.

4. **Finalización del proceso**: Una vez que todas las pruebas automatizadas hayan pasado con éxito y se haya completado la revisión de código manual, el proceso de evaluación habrá terminado. Mantente atento a cualquier comentario adicional o instrucción adicional que puedas recibir.

Recuerda, estamos aquí para apoyarte en cada paso del camino. ¡Feliz codificación!`
  }

  // Smart routing using backend data - enhanced with server token validation
  const handleRepositoryAccess = (repositoryUrl: string) => {
    setValidatingRepository(true)
    
    // Short timeout to show validation state for better UX
    setTimeout(() => {
      try {
        // Use backend data to determine routing
        const hasRepository = githubData?.studentRepository?.exists
        const hasAccess = githubData?.studentRepository?.hasAccess
        
        console.log('Backend data check:', { 
          hasRepository, 
          hasAccess, 
          repositoryUrl,
          fullGithubData: githubData?.studentRepository
        })
        
        if (hasRepository && hasAccess) {
          // Repository exists and user has access - go directly
          console.log('Backend confirms repository access, redirecting to repo:', repositoryUrl)
          window.open(repositoryUrl, '_blank', 'noopener,noreferrer')
        } else {
          // Repository doesn't exist or no access - go to classroom
          console.log('Backend indicates no repository access, redirecting to classroom')
          const classroomUrl = githubData?.classroom?.inviteLink || 
            `https://classroom.github.com/a/${assignmentSlug}`
          window.open(classroomUrl, '_blank', 'noopener,noreferrer')
        }
      } catch (error) {
        // Fallback to classroom on any error
        console.error('🔥 Error during repository routing:', error)
        const classroomUrl = githubData?.classroom?.inviteLink || 
          `https://classroom.github.com/a/${assignmentSlug}`
        window.open(classroomUrl, '_blank', 'noopener,noreferrer')
      } finally {
        setValidatingRepository(false)
      }
    }, 300) // Short delay for UX
  }

  useEffect(() => {
    if (!session) return

    const loadFromCache = () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10)
          const now = Date.now()
          
          if ((now - timestamp) < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData)
            setGithubData(parsedData)
            setLoading(false)
            setError(null)
            return true
          }
        }
      } catch (err) {
        console.warn('Error loading from cache:', err)
        // Clear corrupted cache
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      }
      return false
    }

    // Try to load from cache first
    if (loadFromCache()) {
      return
    }

    // If not loaded from cache, set loading to true
    setLoading(true)

    const fetchGitHubData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          templateRepo: templateRepository,
          assignmentSlug: assignmentSlug,
          assignmentBaseName: 'ejercicios-de-prueba'
        })
        
        const response = await fetch(`/api/github/challenge?${params}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch GitHub data')
        }
        
        // Cache the successful response
        const now = Date.now()
        localStorage.setItem(CACHE_KEY, JSON.stringify(data))
        localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString())
        
        setGithubData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching GitHub data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchGitHubData()
  }, [session, templateRepository, assignmentSlug])

  if (!session) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">Please sign in to access GitHub integration features.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-6">
        <div className="flex items-center justify-center">
          <LoaderIcon className="w-6 h-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Loading challenge content from GitHub...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 mb-2">
            <strong>GitHub Integration Error:</strong> {error}
          </p>
          <p className="text-red-600 text-sm">
            Showing fallback content instead.
          </p>
        </div>
        
        {fallbackContent && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <BookOpenIcon className="w-5 h-5 text-blue-600" />
              Challenge Instructions (Fallback)
            </h3>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {fallbackContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Smart GitHub Integration */}
      {githubData?.classroom && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                <GitBranchIcon className="w-5 h-5" />
                {githubData.studentRepository?.exists ? 'Continue Working on GitHub' : 'Start Working on GitHub'}
              </h3>
              <p className="text-green-700 mb-4">
                {githubData.studentRepository?.exists 
                  ? 'Your personal repository is ready. Click below to continue working on your assignment.'
                  : 'Click the link below to accept the assignment and create your personal repository fork.'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleRepositoryAccess(
              githubData.studentRepository?.url || 
              `https://github.com/B4OS-Dev/ejercicios-de-prueba-${(session?.user as any)?.username}`
            )}
            disabled={validatingRepository}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {validatingRepository ? (
              <LoaderIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ExternalLinkIcon className="w-5 h-5" />
            )}
            {validatingRepository ? 'Verificando acceso...' : 'Go to Your Repository'}
          </button>
          
          <div className="mt-4 text-sm text-green-600">
            <p><strong>Template Repository:</strong> {templateRepository}</p>
          </div>
        </div>
      )}

      {/* Autograding Results */}
      {githubData?.studentRepository?.exists && githubData?.autograding && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <PlayCircleIcon className="w-5 h-5 text-purple-600" />
            Test Results
          </h3>
          
          {githubData.autograding.hasWorkflows ? (
            <div className="space-y-4">
              {githubData.autograding.totalRuns <= 1 ? (
                <div className="border rounded-lg p-4 text-center">
                  <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Ready for your first commit!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Make your first commit to your repository to start working on the challenges.
                  </p>
                </div>
              ) : githubData.autograding.lastRun ? (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {githubData.autograding.lastRun.passed ? (
                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircleIcon className="w-6 h-6 text-red-500" />
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {githubData.autograding.lastRun.passed ? 'Tests Passed!' : 'Tests Failed'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {githubData.autograding.lastRun.passed 
                            ? '¡Felicidades! Todos los tests han pasado exitosamente.'
                            : 'Algunos tests no han pasado. Revisa los errores abajo.'
                          }
                        </p>
                      </div>
                    </div>
                    {githubData.autograding.lastRun.score !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {githubData.autograding.lastRun.score}%
                        </div>
                        <div className="text-sm text-gray-500">Score</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Last run: {new Date(githubData.autograding.lastRun.created_at).toLocaleString()}
                  </div>
                  
                  {/* Show failure details if available */}
                  {!githubData.autograding.lastRun.passed && githubData.autograding.lastRun.failures && githubData.autograding.lastRun.failures.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangleIcon className="w-4 h-4" />
                        <span className="font-medium">Test Failures ({githubData.autograding.lastRun.failures.length})</span>
                      </div>
                      
                      {githubData.autograding.lastRun.failures.map((failure) => (
                        <div key={failure.jobId} className="border border-red-200 rounded-lg">
                          <div 
                            className="flex items-center justify-between p-3 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => toggleLogExpansion(failure.jobId)}
                          >
                            <div className="flex items-center gap-2">
                              <XCircleIcon className="w-4 h-4 text-red-500" />
                              <span className="font-medium text-red-900">{failure.jobName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={failure.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon className="w-3 h-3" />
                                GitHub
                              </a>
                              {expandedLogs[failure.jobId] ? (
                                <ChevronUpIcon className="w-4 h-4 text-red-600" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          </div>
                          
                          {expandedLogs[failure.jobId] && (
                            <div className="p-3 border-t border-red-200">
                              <div className="mb-3">
                                <h5 className="font-medium text-gray-900 mb-2">Error Summary:</h5>
                                <div className="bg-gray-100 p-3 rounded text-sm font-mono whitespace-pre-wrap text-gray-800">
                                  {extractErrorSummary(failure.logs)}
                                </div>
                              </div>
                              
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                  View Full Logs
                                </summary>
                                <div className="mt-2 bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {formatLogs(failure.logs)}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center">
                  <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No test results yet.</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Make your first commit to your repository to trigger autograding tests.
                  </p>
                </div>
              )}
              
              {githubData.autograding.totalRuns > 1 && (
                <div className="text-sm text-gray-500">
                  Total test runs: {githubData.autograding.totalRuns}
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4 text-center">
              <PlayCircleIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No autograding workflows configured.</p>
              <p className="text-sm text-gray-500 mt-1">
                Tests will be available once you make your first commit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* README Content from GitHub */}
      {githubData?.content && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-blue-500" />
              Challenge Instructions (from GitHub)
            </h3>
            <a
              href={githubData.content.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
          
          <div className="prose prose-sm max-w-none prose-gray prose-headings:text-gray-900 prose-p:text-gray-800">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="break-words text-gray-800 leading-relaxed mb-4">{children}</p>,
                h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
                code: ({ children }) => <code className="break-words bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                pre: ({ children }) => <pre className="break-words bg-gray-900 text-gray-100 p-4 rounded-lg whitespace-pre-wrap overflow-wrap-anywhere">{children}</pre>,
                ul: ({ children }) => <ul className="list-disc list-inside text-gray-800 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-gray-800 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-800">{children}</li>
              }}
            >
              {githubData.content.readme}
            </ReactMarkdown>
          </div>
          
          {githubData.content.lastModified && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(githubData.content.lastModified).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hardcoded README Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <BookOpenIcon className="w-5 h-5 text-blue-600" />
            Challenge Instructions
          </h3>
        </div>
        
        <div className="prose prose-sm max-w-none prose-gray prose-headings:text-gray-900 prose-p:text-gray-800">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="break-words text-gray-800 leading-relaxed mb-4">{children}</p>,
              h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-6">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
              code: ({ children }) => <code className="break-words bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
              pre: ({ children }) => <pre className="break-words bg-gray-900 text-gray-100 p-4 rounded-lg whitespace-pre-wrap overflow-wrap-anywhere">{children}</pre>,
              ul: ({ children }) => <ul className="list-disc pl-6 text-gray-800 space-y-2 mb-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 text-gray-800 space-y-2 mb-4">{children}</ol>,
              li: ({ children }) => <li className="text-gray-800 leading-relaxed">{children}</li>
            }}
          >
            {getOriginalReadme()}
          </ReactMarkdown>
        </div>
      </div>

    </div>
  )
}
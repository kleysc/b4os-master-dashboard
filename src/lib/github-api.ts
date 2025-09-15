interface GitHubRepository {
  owner: string
  name: string
}

interface GitHubReadmeResponse {
  content: string
  encoding: string
  download_url: string
  html_url: string
}

interface GitHubContent {
  readme: string
  htmlUrl: string
  lastModified?: string
}

interface GitHubWorkflowRun {
  id: number
  name: string
  head_branch: string
  head_sha: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
  created_at: string
  updated_at: string
  html_url: string
}

interface GitHubWorkflowRunsResponse {
  total_count: number
  workflow_runs: GitHubWorkflowRun[]
}

interface GitHubWorkflowJob {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
  started_at: string
  completed_at: string | null
  html_url: string
}

interface GitHubWorkflowJobsResponse {
  total_count: number
  jobs: GitHubWorkflowJob[]
}

interface TestFailure {
  jobName: string
  jobId: number
  logs: string
  htmlUrl: string
}

interface WorkflowRunResult {
  id: number
  status: string
  conclusion: string | null
  created_at: string
  html_url: string
  passed: boolean
  score?: number
  failures?: TestFailure[]
}

interface AutogradingResult {
  hasWorkflows: boolean
  lastRun?: WorkflowRunResult
  allRuns?: WorkflowRunResult[]
  totalRuns: number
}

class GitHubAPIService {
  private baseUrl = 'https://api.github.com'
  
  constructor(private accessToken?: string) {}

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'B4OS-Challenges-Platform'
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    return headers
  }

  // Parse GitHub repository URL or return owner/name
  private parseRepository(repoUrl: string): GitHubRepository {
    // Handle various formats:
    // - https://github.com/owner/repo
    // - owner/repo
    // - https://github.com/owner/repo.git
    
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/)
      if (match) {
        return { owner: match[1], name: match[2] }
      }
    } else if (repoUrl.includes('/')) {
      const [owner, name] = repoUrl.split('/')
      return { owner, name }
    }
    
    throw new Error(`Invalid repository format: ${repoUrl}`)
  }

  // Fetch README content from a repository
  async fetchReadme(repoUrl: string): Promise<GitHubContent | null> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}/readme`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: GitHubReadmeResponse = await response.json()
      
      // Decode base64 content
      const content = data.encoding === 'base64' 
        ? atob(data.content.replace(/\n/g, ''))
        : data.content

      return {
        readme: content,
        htmlUrl: data.html_url,
        lastModified: response.headers.get('last-modified') || undefined
      }
    } catch (error) {
      console.error('Error fetching README:', error)
      return null
    }
  }

  // Generate GitHub Classroom invite link
  generateClassroomInvite(assignmentSlug: string): string {
    return `https://classroom.github.com/a/${assignmentSlug}`
  }

  // Fetch repository information
  async fetchRepositoryInfo(repoUrl: string): Promise<any> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching repository info:', error)
      return null
    }
  }

  // Check if user has access to repository
  async checkRepositoryAccess(repoUrl: string): Promise<boolean> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}`, {
        headers: this.getHeaders()
      })

      return response.ok
    } catch (error) {
      console.error('Error checking repository access:', error)
      return false
    }
  }

  // Generate student repository URL based on assignment pattern
  generateStudentRepoUrl(assignmentBaseName: string, githubUsername: string): string {
    return `https://github.com/B4OS-Dev/${assignmentBaseName}-${githubUsername}`
  }

  // Check if student has already accepted and has their own repository
  async checkStudentRepository(assignmentBaseName: string, githubUsername: string): Promise<{
    exists: boolean
    url: string
    hasAccess: boolean
    statusCode: number
  }> {
    const studentRepoUrl = this.generateStudentRepoUrl(assignmentBaseName, githubUsername)
    
    console.log('Checking student repository:', {
      assignmentBaseName,
      githubUsername,
      studentRepoUrl
    })
    
    try {
      const { owner, name } = this.parseRepository(studentRepoUrl)
      
      console.log('Making API call to:', `${this.baseUrl}/repos/${owner}/${name}`)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}`, {
        headers: this.getHeaders()
      })

      const statusCode = response.status
      
      console.log('GitHub API Response:', {
        statusCode,
        statusText: response.statusText,
        url: studentRepoUrl
      })
      
      // Repository exists if we get a 200 response
      const exists = statusCode === 200
      // User has access if we get 200 or 403 (exists but no access)
      const hasAccess = statusCode === 200 || statusCode === 403
      
      console.log('Repository check result:', {
        exists,
        hasAccess,
        statusCode,
        url: studentRepoUrl
      })
      
      return {
        exists,
        url: studentRepoUrl,
        hasAccess,
        statusCode
      }
    } catch (error) {
      console.error('Error checking student repository:', error)
      return {
        exists: false,
        url: studentRepoUrl,
        hasAccess: false,
        statusCode: 0
      }
    }
  }

  // Fetch autograding results from GitHub Actions
  async fetchAutogradingResults(repoUrl: string): Promise<AutogradingResult> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)

      console.log('Fetching workflow runs for:', { owner, name })

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}/actions/runs?per_page=10`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.error(`GitHub Actions API error: ${response.status} ${response.statusText}`)
        return {
          hasWorkflows: false,
          totalRuns: 0
        }
      }

      const data: GitHubWorkflowRunsResponse = await response.json()

      console.log('Workflow runs response:', {
        total_count: data.total_count,
        runs: data.workflow_runs.length
      })

      if (data.total_count === 0) {
        return {
          hasWorkflows: false,
          totalRuns: 0
        }
      }

      // Get all completed workflow runs (success or failure)
      const completedRuns = data.workflow_runs
        .filter(run =>
          run.status === 'completed' &&
          (run.conclusion === 'success' || run.conclusion === 'failure')
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (completedRuns.length === 0) {
        // Check if there are any runs at all
        const hasAnyRuns = data.workflow_runs.length > 0
        return {
          hasWorkflows: true,
          totalRuns: data.total_count,
          lastRun: hasAnyRuns ? undefined : undefined // No meaningful runs yet
        }
      }

      // Process all completed runs
      const allRuns: WorkflowRunResult[] = []

      for (const run of completedRuns) {
        const passed = run.conclusion === 'success'

        // Fetch failure logs if the run failed
        let failures: TestFailure[] = []
        if (!passed && run.conclusion === 'failure') {
          console.log('Fetching failure logs for run:', run.id)
          failures = await this.fetchWorkflowJobLogs(repoUrl, run.id)
        }

        allRuns.push({
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          html_url: run.html_url,
          passed,
          score: passed ? 100 : 0, // Basic scoring - can be enhanced later
          failures: failures.length > 0 ? failures : undefined
        })
      }

      const lastRun = allRuns[0] // Most recent

      console.log('Processed workflow runs:', {
        total: allRuns.length,
        latest: lastRun ? { id: lastRun.id, passed: lastRun.passed } : 'none'
      })

      return {
        hasWorkflows: true,
        lastRun,
        allRuns,
        totalRuns: data.total_count
      }
    } catch (error) {
      console.error('Error fetching autograding results:', error)
      return {
        hasWorkflows: false,
        totalRuns: 0
      }
    }
  }

  // Fetch logs for failed workflow jobs
  async fetchWorkflowJobLogs(repoUrl: string, runId: number): Promise<TestFailure[]> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      // Get jobs for this workflow run
      const jobsResponse = await fetch(`${this.baseUrl}/repos/${owner}/${name}/actions/runs/${runId}/jobs`, {
        headers: this.getHeaders()
      })

      if (!jobsResponse.ok) {
        console.error(`GitHub Jobs API error: ${jobsResponse.status} ${jobsResponse.statusText}`)
        return []
      }

      const jobsData: GitHubWorkflowJobsResponse = await jobsResponse.json()
      
      // Get failed jobs
      const failedJobs = jobsData.jobs.filter(job => 
        job.status === 'completed' && job.conclusion === 'failure'
      )

      if (failedJobs.length === 0) {
        return []
      }

      const failures: TestFailure[] = []

      // Fetch logs for each failed job
      for (const job of failedJobs) {
        try {
          const logsResponse = await fetch(`${this.baseUrl}/repos/${owner}/${name}/actions/jobs/${job.id}/logs`, {
            headers: this.getHeaders()
          })

          if (logsResponse.ok) {
            const logs = await logsResponse.text()
            failures.push({
              jobName: job.name,
              jobId: job.id,
              logs: logs,
              htmlUrl: job.html_url
            })
          }
        } catch (logError) {
          console.error(`Error fetching logs for job ${job.id}:`, logError)
        }
      }

      return failures
    } catch (error) {
      console.error('Error fetching workflow job logs:', error)
      return []
    }
  }
}

// Export singleton with no token (for public repos)
export const githubAPI = new GitHubAPIService()

// Export factory for authenticated requests
export const createGitHubAPI = (accessToken: string) => 
  new GitHubAPIService(accessToken)

// Export factory for server requests with enhanced permissions
export const createServerGitHubAPI = () => {
  const serverToken = process.env.GITHUB_SERVER_TOKEN
  if (!serverToken) {
    console.warn('GITHUB_SERVER_TOKEN not found, using limited permissions')
    return new GitHubAPIService()
  }
  console.log('Using GITHUB_SERVER_TOKEN for enhanced repository access')
  return new GitHubAPIService(serverToken)
}

export type { GitHubRepository, GitHubContent, GitHubWorkflowRun, AutogradingResult, WorkflowRunResult, TestFailure }
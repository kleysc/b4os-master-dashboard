"""
GitHub Classroom to Supabase Sync Tool

A robust tool for synchronizing GitHub Classroom grades directly to Supabase
without intermediate CSV files. Designed for production use with comprehensive
error handling, logging, and data validation.

Author: Senior Developer
Version: 2.0.0
License: MIT
"""

import os
import sys
import pandas as pd
import datetime
import logging
import tempfile
import subprocess
import requests
import time
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any, Union
from dataclasses import dataclass
from dotenv import load_dotenv
from supabase import create_client, Client
try:
    from supabase.exceptions import APIError
except ImportError:
    # Fallback for older versions of supabase-py
    class APIError(Exception):
        pass

# Load environment variables
load_dotenv()

# Configure logging with proper structure
def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Setup structured logging configuration."""
    log_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create logs directory if it doesn't exist (relative to project root)
    log_dir = Path("../logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'classroom_sync.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

logger = setup_logging(os.getenv('LOG_LEVEL', 'INFO'))

@dataclass
class SyncConfig:
    """Configuration class for sync operations."""
    supabase_url: str
    supabase_key: str
    classroom_name: str
    assignment_id: Optional[str] = None
    log_level: str = "INFO"
    max_retries: int = 3
    timeout_seconds: int = 30

class GitHubCLIError(Exception):
    """Custom exception for GitHub CLI errors."""
    pass

class SupabaseSyncError(Exception):
    """Custom exception for Supabase sync errors."""
    pass

class DataValidationError(Exception):
    """Custom exception for data validation errors."""
    pass

class GitHubAPIError(Exception):
    """Custom exception for GitHub API errors."""
    pass

class ClassroomSupabaseSync:
    """
    Robust GitHub Classroom to Supabase synchronization client.
    
    Features:
    - Comprehensive error handling
    - Data validation
    - Retry mechanisms
    - Structured logging
    - Type safety
    """
    
    def __init__(self, config: SyncConfig):
        """
        Initialize the Classroom Supabase sync client.
        
        Args:
            config: SyncConfig object with all required configuration
        """
        self.config = config
        self.supabase: Client = self._initialize_supabase()
        logger.info("ClassroomSupabaseSync initialized successfully")
    
    def _initialize_supabase(self) -> Client:
        """Initialize Supabase client with error handling."""
        try:
            client = create_client(self.config.supabase_url, self.config.supabase_key)
            # Test connection with a simple query that doesn't require RLS
            client.table('students').select('github_username').limit(1).execute()
            logger.info("Supabase connection verified")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise SupabaseSyncError(f"Supabase initialization failed: {e}")
    
    def _execute_gh_command(self, command: str) -> str:
        """
        Execute GitHub CLI command with proper error handling.
        
        Args:
            command: GitHub CLI command to execute
            
        Returns:
            Command output as string
            
        Raises:
            GitHubCLIError: If command execution fails
        """
        try:
            result = subprocess.run(
                command.split(),
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
                check=True
            )
            return result.stdout
        except subprocess.TimeoutExpired:
            logger.error(f"GitHub CLI command timed out: {command}")
            raise GitHubCLIError(f"Command timed out: {command}")
        except subprocess.CalledProcessError as e:
            logger.error(f"GitHub CLI command failed: {command}, Error: {e.stderr}")
            raise GitHubCLIError(f"Command failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error executing command: {command}, Error: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def get_classroom_id(self, classroom_name: str) -> Optional[str]:
        """
        Get classroom ID by name with comprehensive error handling.
        
        Args:
            classroom_name: Name of the classroom to find
            
        Returns:
            Classroom ID if found, None otherwise
        """
        logger.info(f"Searching for classroom: {classroom_name}")
        
        try:
            output = self._execute_gh_command('gh classroom list')
            classrooms = self._parse_classroom_list(output)
            
            for classroom_id, name in classrooms:
                if name == classroom_name:
                    logger.info(f"Found classroom ID: {classroom_id}")
                    return classroom_id
            
            logger.warning(f"Classroom '{classroom_name}' not found")
            return None
            
        except GitHubCLIError as e:
            logger.error(f"Failed to get classroom list: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting classroom ID: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def _parse_classroom_list(self, output: str) -> List[Tuple[str, str]]:
        """
        Parse classroom list output from GitHub CLI.
        
        Args:
            output: Raw output from 'gh classroom list'
            
        Returns:
            List of (classroom_id, classroom_name) tuples
        """
        lines = output.strip().split('\n')
        if len(lines) < 4:
            raise DataValidationError("Invalid classroom list format")
        
        # Skip header lines (first 3 lines)
        classrooms = []
        for line in lines[3:]:
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    classrooms.append((parts[0], parts[1]))
        
        return classrooms
    
    def get_assignments(self, classroom_id: str) -> List[Tuple[str, str, str]]:
        """
        Get assignments for a classroom with error handling.
        
        Args:
            classroom_id: ID of the classroom
            
        Returns:
            List of (assignment_id, assignment_name, assignment_repo) tuples
        """
        logger.info(f"Getting assignments for classroom: {classroom_id}")
        
        try:
            output = self._execute_gh_command(f'gh classroom assignments -c {classroom_id}')
            assignments = self._parse_assignments_list(output)
            logger.info(f"Found {len(assignments)} assignments")
            return assignments
            
        except GitHubCLIError as e:
            logger.error(f"Failed to get assignments: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting assignments: {e}")
            raise GitHubCLIError(f"Unexpected error: {e}")
    
    def _parse_assignments_list(self, output: str) -> List[Tuple[str, str, str]]:
        """
        Parse assignments list output from GitHub CLI.
        
        Args:
            output: Raw output from 'gh classroom assignments'
            
        Returns:
            List of (assignment_id, assignment_name, assignment_repo) tuples
        """
        lines = output.strip().split('\n')
        if len(lines) < 4:
            raise DataValidationError("Invalid assignments list format")
        
        assignments = []
        for line in lines[3:]:  # Skip header lines
            if line.strip():
                parts = line.split('\t')
                if len(parts) >= 7:
                    assignments.append((parts[0], parts[1], parts[6]))
        
        return assignments
    
    def download_grades_to_dataframe(self, assignment_id: str) -> Optional[pd.DataFrame]:
        """
        Download grades for an assignment with robust error handling.
        
        Args:
            assignment_id: ID of the assignment
            
        Returns:
            DataFrame with grades data or None if failed
        """
        logger.info(f"Downloading grades for assignment: {assignment_id}")
        
        temp_file = None
        try:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(mode='w+', suffix='.csv', delete=False)
            temp_path = temp_file.name
            temp_file.close()
            
            # Download grades
            self._execute_gh_command(f'gh classroom assignment-grades -a {assignment_id} -f {temp_path}')
            
            # Validate file
            if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                logger.warning(f"No grades data found for assignment: {assignment_id}")
                return None
            
            # Load and validate DataFrame
            df = pd.read_csv(temp_path)
            self._validate_grades_dataframe(df, assignment_id)
            
            logger.info(f"Successfully downloaded {len(df)} grade records")
            return df
            
        except (GitHubCLIError, DataValidationError) as e:
            logger.error(f"Failed to download grades for {assignment_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading grades: {e}")
            return None
        finally:
            # Cleanup
            if temp_file and os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _validate_grades_dataframe(self, df: pd.DataFrame, assignment_id: str) -> None:
        """
        Validate grades DataFrame structure and data.
        
        Args:
            df: DataFrame to validate
            assignment_id: Assignment ID for context
            
        Raises:
            DataValidationError: If validation fails
        """
        required_columns = ['github_username', 'points_awarded', 'points_available']
        
        # Check required columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise DataValidationError(f"Missing required columns: {missing_columns}")
        
        # Check for empty DataFrame
        if df.empty:
            raise DataValidationError("Empty grades DataFrame")
        
        # Check data types
        if not df['github_username'].dtype == 'object':
            raise DataValidationError("github_username must be string type")
        
        # Check for null values in critical columns
        if df['github_username'].isnull().any():
            raise DataValidationError("github_username cannot contain null values")
        
        logger.debug(f"Grades DataFrame validation passed for assignment: {assignment_id}")
    
    def get_repository_info(self, repo_url: str) -> Optional[Dict[str, Any]]:
        """
        Get repository information from GitHub API including creation and update dates.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Dictionary with repository info or None if failed
        """
        if not repo_url or not isinstance(repo_url, str):
            logger.warning(f"Invalid repository URL: {repo_url}")
            return None
        
        try:
            # Extract owner/repo from URL
            # URL format: https://github.com/B4OS-Dev/the-moria-mining-codex-part-1-kleysc
            url_parts = repo_url.replace('https://github.com/', '').split('/')
            if len(url_parts) != 2:
                logger.warning(f"Invalid GitHub URL format: {repo_url}")
                return None
            
            owner, repo = url_parts
            
            # Get GitHub token from environment
            github_token = os.getenv('GITHUB_TOKEN')
            headers = {}
            if github_token:
                headers['Authorization'] = f'token {github_token}'
            
            # Make API request
            api_url = f'https://api.github.com/repos/{owner}/{repo}'
            response = requests.get(api_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                repo_data = response.json()
                return {
                    'created_at': repo_data.get('created_at'),
                    'updated_at': repo_data.get('updated_at'),
                    'pushed_at': repo_data.get('pushed_at'),
                    'full_name': repo_data.get('full_name'),
                    'html_url': repo_data.get('html_url'),
                    'is_fork': repo_data.get('fork', False),
                    'parent': repo_data.get('parent')
                }
            elif response.status_code == 404:
                logger.warning(f"Repository not found: {repo_url}")
                return None
            elif response.status_code == 403:
                logger.warning(f"Rate limit exceeded for repository: {repo_url}")
                return None
            else:
                logger.warning(f"GitHub API error {response.status_code} for repository: {repo_url}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error getting repository info for {repo_url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting repository info for {repo_url}: {e}")
            return None
    
    def calculate_resolution_time(self, created_at: str, updated_at: str) -> Optional[int]:
        """
        Calculate resolution time in hours between repository creation and last update.
        This represents the time from fork creation to reaching maximum score.
        
        Args:
            created_at: Repository creation timestamp (fork date)
            updated_at: Repository last update timestamp (when max score was reached)
            
        Returns:
            Resolution time in hours or None if calculation fails
        """
        try:
            if not created_at or not updated_at:
                return None
            
            # Parse timestamps
            created = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            updated = datetime.datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            
            # Calculate difference in hours
            time_diff = updated - created
            resolution_hours = int(time_diff.total_seconds() / 3600)
            
            return resolution_hours
            
        except Exception as e:
            logger.error(f"Error calculating resolution time: {e}")
            return None
    
    def refresh_admin_leaderboard(self) -> None:
        """
        Refresh the admin leaderboard table with current data.
        This version calculates the ranking directly in Python instead of using SQL function.
        
        Raises:
            SupabaseSyncError: If refresh fails
        """
        logger.info("Refreshing admin leaderboard...")
        
        try:
            # Get all students with their data
            students_result = self.supabase.table('students').select('github_username, fork_created_at, last_updated_at, has_fork').execute()
            
            if not students_result.data:
                logger.warning("No students found for leaderboard")
                return
            
            # Get all grades
            grades_result = self.supabase.table('grades').select('github_username, assignment_name, points_awarded').execute()
            
            # Get all assignments
            assignments_result = self.supabase.table('assignments').select('name, points_available').execute()
            
            # Create lookup dictionaries
            assignment_points = {a['name']: a['points_available'] for a in assignments_result.data if a['points_available']}
            
            # Calculate leaderboard data for each student
            leaderboard_data = []
            
            for student in students_result.data:
                github_username = student['github_username']
                has_fork = student.get('has_fork', False)
                
                # Get grades for this student
                student_grades = [g for g in grades_result.data if g['github_username'] == github_username]
                
                # Calculate totals
                total_score = sum(grade['points_awarded'] for grade in student_grades if grade['points_awarded'])
                total_possible = sum(assignment_points.get(grade['assignment_name'], 0) for grade in student_grades)
                percentage = round((total_score / total_possible) * 100) if total_possible > 0 else 0
                
                # Count unique assignments completed (not just grade records)
                unique_assignments = set(grade['assignment_name'] for grade in student_grades)
                assignments_completed = len(unique_assignments)
                
                # Calculate resolution time only if student has a fork
                if has_fork:
                    resolution_time_hours = self.calculate_resolution_time(
                        student['fork_created_at'], 
                        student['last_updated_at']
                    )
                else:
                    resolution_time_hours = None
                    logger.info(f"Student {github_username} has no fork - skipping resolution time calculation")
                
                leaderboard_data.append({
                    'github_username': github_username,
                    'fork_created_at': student['fork_created_at'],
                    'last_updated_at': student['last_updated_at'],
                    'resolution_time_hours': resolution_time_hours,
                    'has_fork': has_fork,
                    'total_score': total_score,
                    'total_possible': total_possible,
                    'percentage': percentage,
                    'assignments_completed': assignments_completed
                })
            
            # Sort by ranking criteria: 
            # 1. Resolution time ASC (who solved fastest)
            # 2. Percentage DESC (higher score as tiebreaker)
            # 3. Username ASC (alphabetical as final tiebreaker)
            leaderboard_data.sort(key=lambda x: (
                x['resolution_time_hours'] if x['resolution_time_hours'] is not None else 999999,
                -x['percentage'],  # Negative for descending order
                x['github_username']
            ))
            
            # Log ranking for verification
            logger.info("Ranking by resolution time (fastest to slowest):")
            for i, student in enumerate(leaderboard_data[:5], 1):  # Log top 5
                resolution_time = student['resolution_time_hours']
                if resolution_time is not None:
                    hours = resolution_time // 24
                    minutes = (resolution_time % 24) // 60
                    time_str = f"{hours}d {minutes}h" if hours > 0 else f"{minutes}h"
                else:
                    time_str = "N/A"
                logger.info(f"  {i}. {student['github_username']}: {time_str} ({student['percentage']}%)")
            
            # Add ranking positions
            for i, student in enumerate(leaderboard_data, 1):
                student['ranking_position'] = i
            
            # Clear existing data and insert new data
            # Use a different approach to clear data that works with RLS
            try:
                # Try to clear existing data
                self.supabase.table('admin_leaderboard').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            except Exception as e:
                logger.warning(f"Could not clear existing data: {e}")
                # Continue anyway, the insert will handle conflicts
            
            # Insert new data in batches to avoid RLS issues
            batch_size = 10
            for i in range(0, len(leaderboard_data), batch_size):
                batch = leaderboard_data[i:i + batch_size]
                try:
                    result = self.supabase.table('admin_leaderboard').insert(batch).execute()
                    logger.info(f"Inserted batch {i//batch_size + 1} with {len(batch)} students")
                except Exception as e:
                    logger.error(f"Failed to insert batch {i//batch_size + 1}: {e}")
                    # Try individual inserts
                    for student in batch:
                        try:
                            self.supabase.table('admin_leaderboard').upsert(student, on_conflict='github_username').execute()
                        except Exception as individual_error:
                            logger.error(f"Failed to insert individual student {student['github_username']}: {individual_error}")
            
            logger.info(f"Admin leaderboard refreshed successfully with {len(leaderboard_data)} students")
            
        except Exception as e:
            logger.error(f"Failed to refresh admin leaderboard: {e}")
            raise SupabaseSyncError(f"Failed to refresh admin leaderboard: {e}")
    
    def format_assignment_name(self, name: str) -> str:
        """
        Format assignment name for database storage.
        
        Args:
            name: Original assignment name
            
        Returns:
            Formatted assignment name
        """
        if not name or not isinstance(name, str):
            raise DataValidationError("Assignment name must be a non-empty string")
        
        # Clean and format assignment name for GitHub repository naming
        # Convert to lowercase, replace spaces and special chars with hyphens
        # Remove multiple consecutive hyphens
        import re
        formatted = name.lower()
        formatted = re.sub(r'[^a-z0-9\s-]', '', formatted)  # Keep only alphanumeric, spaces, and hyphens
        formatted = re.sub(r'\s+', '-', formatted)  # Replace spaces with single hyphen
        formatted = re.sub(r'-+', '-', formatted)  # Replace multiple hyphens with single hyphen
        formatted = formatted.strip('-')  # Remove leading/trailing hyphens
        
        logger.debug(f"Formatted assignment name: '{name}' -> '{formatted}'")
        return formatted
    
    def sync_students_to_supabase(self, students_data: List[Dict[str, Any]]) -> None:
        """
        Sync students to Supabase with retry mechanism.
        
        Args:
            students_data: List of student data dictionaries with repository info
            
        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if not students_data:
            logger.warning("No students to sync")
            return
        
        logger.info(f"Syncing {len(students_data)} students to Supabase")
        
        # Prepare data for Supabase
        supabase_data = []
        for student in students_data:
            try:
                student_record = {
                    "github_username": str(student['github_username']).strip(),
                    "updated_at": datetime.datetime.now().isoformat()
                }
                
                # Add repository dates if available
                if 'fork_created_at' in student and student['fork_created_at']:
                    student_record['fork_created_at'] = student['fork_created_at']
                
                if 'last_updated_at' in student and student['last_updated_at']:
                    student_record['last_updated_at'] = student['last_updated_at']
                
                if 'resolution_time_hours' in student and student['resolution_time_hours'] is not None:
                    student_record['resolution_time_hours'] = student['resolution_time_hours']
                
                supabase_data.append(student_record)
                
            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid student data: {student}, Error: {e}")
                continue
        
        if not supabase_data:
            logger.warning("No valid students data to sync")
            return
        
        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                result = self.supabase.table('students').upsert(
                    supabase_data,
                    on_conflict='github_username'
                ).execute()
                logger.info(f"Successfully synced {len(supabase_data)} students")
                return
                
            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync students after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing students (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync students: {e}")
    
    def sync_assignments_to_supabase(self, assignments: List[Dict[str, Any]]) -> None:
        """
        Sync assignments to Supabase with retry mechanism.
        
        Args:
            assignments: List of assignment data dictionaries
            
        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if not assignments:
            logger.warning("No assignments to sync")
            return
        
        logger.info(f"Syncing {len(assignments)} assignments to Supabase")
        
        # Prepare data with validation
        assignments_data = []
        for assignment in assignments:
            try:
                points_available = assignment.get('points_available')
                assignments_data.append({
                    "name": str(assignment['name']).strip(),
                    "points_available": int(points_available) if points_available is not None else None,
                    "updated_at": datetime.datetime.now().isoformat()
                })
            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid assignment data: {assignment}, Error: {e}")
                continue
        
        if not assignments_data:
            logger.warning("No valid assignments data to sync")
            return
        
        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                result = self.supabase.table('assignments').upsert(
                    assignments_data, 
                    on_conflict='name'
                ).execute()
                logger.info(f"Successfully synced {len(assignments_data)} assignments")
                return
                
            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignments after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing assignments (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync assignments: {e}")
    
    def sync_grades_to_supabase(self, grades_df: pd.DataFrame) -> None:
        """
        Sync grades to Supabase with retry mechanism.
        
        Args:
            grades_df: DataFrame with grades data
            
        Raises:
            SupabaseSyncError: If sync fails after retries
        """
        if grades_df.empty:
            logger.warning("No grades to sync")
            return
        
        logger.info(f"Syncing {len(grades_df)} grade records to Supabase")
        
        # Prepare data with validation
        grades_data = []
        for _, row in grades_df.iterrows():
            try:
                points_awarded = row['points_awarded']
                grades_data.append({
                    "github_username": str(row['github_username']).strip(),
                    "assignment_name": str(row['assignment_name']).strip(),
                    "points_awarded": int(points_awarded) if pd.notna(points_awarded) else None,
                    "updated_at": datetime.datetime.now().isoformat()
                })
            except (KeyError, ValueError, TypeError) as e:
                logger.error(f"Invalid grade data: {row.to_dict()}, Error: {e}")
                continue
        
        if not grades_data:
            logger.warning("No valid grades data to sync")
            return
        
        # Retry mechanism
        for attempt in range(self.config.max_retries):
            try:
                result = self.supabase.table('grades').upsert(
                    grades_data,
                    on_conflict='github_username,assignment_name'
                ).execute()
                logger.info(f"Successfully synced {len(grades_data)} grade records")
                return
                
            except APIError as e:
                logger.error(f"Supabase API error (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync grades after {self.config.max_retries} attempts: {e}")
            except Exception as e:
                logger.error(f"Unexpected error syncing grades (attempt {attempt + 1}): {e}")
                if attempt == self.config.max_retries - 1:
                    raise SupabaseSyncError(f"Failed to sync grades: {e}")
    
    def process_assignments_in_memory(self, assignment_data: List[Tuple[str, str, str]]) -> pd.DataFrame:
        """
        Process all assignments and consolidate grades in memory.
        
        Args:
            assignment_data: List of (assignment_id, assignment_name, assignment_repo) tuples
            
        Returns:
            Consolidated grades DataFrame
        """
        logger.info("Processing assignments in memory...")
        all_grades = []
        assignment_info = []
        students_with_repo_info = {}  # Store student data with repository info
        
        for assignment_id, assignment_name, assignment_repo in assignment_data:
            logger.info(f"Processing assignment: {assignment_name} (ID: {assignment_id})")
            
            try:
                # Download grades
                df = self.download_grades_to_dataframe(assignment_id)
                
                if df is not None and not df.empty:
                    # Format assignment name
                    formatted_name = self.format_assignment_name(assignment_name)
                    
                    # Store assignment info - use max points_available instead of first record
                    if 'points_available' in df.columns:
                        # Get the maximum points_available from all records
                        points_available = df['points_available'].max()
                        
                        # If max is 0 or NaN, try to get a non-zero value
                        if points_available == 0 or pd.isna(points_available):
                            non_zero_points = df[df['points_available'] > 0]['points_available']
                            if not non_zero_points.empty:
                                points_available = non_zero_points.iloc[0]
                            else:
                                # Special case: if this is Part 2 and points_available is 0, use 100 as default
                                # This handles cases where GitHub Classroom API returns 0 but the assignment actually has points
                                if 'part-2' in formatted_name.lower():
                                    points_available = 100
                                    logger.info(f"Assignment {formatted_name} - Using default 100 points for Part 2 (API returned 0)")
                                else:
                                    points_available = None
                                    logger.warning(f"Assignment {formatted_name} - No non-zero points_available found")
                    else:
                        points_available = None
                        logger.warning(f"Assignment {formatted_name} - No points_available column found")
                    
                    assignment_info.append({
                        'name': formatted_name,
                        'points_available': points_available
                    })
                    
                    # Process grades data and get repository info
                    grades_df = df[['github_username', 'points_awarded', 'points_available']].copy()
                    grades_df['assignment_name'] = formatted_name
                    grades_df = grades_df[['github_username', 'assignment_name', 'points_awarded']]
                    
                    # Get repository information for each student
                    logger.info(f"Getting repository information for {len(df)} students...")
                    for _, row in df.iterrows():
                        github_username = str(row['github_username']).strip()
                        student_repo_url = row.get('student_repository_url', '')
                        
                        if github_username not in students_with_repo_info and student_repo_url:
                            logger.info(f"Getting repo info for {github_username}: {student_repo_url}")
                            
                            # Get repository information
                            repo_info = self.get_repository_info(student_repo_url)
                            
                            if repo_info:
                                # Verify this is actually a fork (has parent repository)
                                if repo_info.get('is_fork', False):
                                    # Calculate resolution time only for actual forks
                                    resolution_time = self.calculate_resolution_time(
                                        repo_info['created_at'], 
                                        repo_info['updated_at']
                                    )
                                    
                                    students_with_repo_info[github_username] = {
                                        'github_username': github_username,
                                        'fork_created_at': repo_info['created_at'],
                                        'last_updated_at': repo_info['updated_at'],
                                        'resolution_time_hours': resolution_time,
                                        'has_fork': True
                                    }
                                    
                                    logger.info(f"FORK FOUND for {github_username}: "
                                              f"created={repo_info['created_at']}, "
                                              f"updated={repo_info['updated_at']}, "
                                              f"resolution={resolution_time}h")
                                else:
                                    # Repository exists but is not a fork
                                    logger.warning(f"Repository exists for {github_username} but is NOT a fork")
                                    students_with_repo_info[github_username] = {
                                        'github_username': github_username,
                                        'fork_created_at': None,
                                        'last_updated_at': None,
                                        'resolution_time_hours': None,
                                        'has_fork': False
                                    }
                            else:
                                logger.warning(f"Could not get repository info for {github_username} - no fork exists")
                                # Add student without repo info
                                students_with_repo_info[github_username] = {
                                    'github_username': github_username,
                                    'fork_created_at': None,
                                    'last_updated_at': None,
                                    'resolution_time_hours': None,
                                    'has_fork': False
                                }
                            
                            # Add small delay to respect GitHub API rate limits
                            time.sleep(0.1)
                    
                    all_grades.append(grades_df)
                    logger.info(f"Processed {len(grades_df)} grades for assignment: {formatted_name}")
                else:
                    logger.warning(f"No grades data for assignment: {assignment_name}")
                    
            except Exception as e:
                logger.error(f"Error processing assignment {assignment_name}: {e}")
                continue
        
        # Consolidate all grades
        if all_grades:
            consolidated_df = pd.concat(all_grades, ignore_index=True)
            logger.info(f"Consolidated {len(consolidated_df)} total grade records")
            
            # Sync to Supabase
            try:
                self.sync_assignments_to_supabase(assignment_info)
                self.sync_students_to_supabase(list(students_with_repo_info.values()))
                self.sync_grades_to_supabase(consolidated_df)
                self.refresh_admin_leaderboard()
            except SupabaseSyncError as e:
                logger.error(f"Failed to sync data to Supabase: {e}")
                raise
            
            return consolidated_df
        else:
            logger.warning("No grades data found for any assignments")
            return pd.DataFrame()
    
    def run_sync(self) -> None:
        """
        Main method to run the complete sync process.
        
        Raises:
            GitHubCLIError: If GitHub CLI operations fail
            SupabaseSyncError: If Supabase operations fail
            DataValidationError: If data validation fails
        """
        logger.info("Starting GitHub Classroom to Supabase sync process")
        
        try:
            # Get classroom ID
            classroom_id = self.get_classroom_id(self.config.classroom_name)
            if not classroom_id:
                raise GitHubCLIError(f"Classroom '{self.config.classroom_name}' not found")
            
            # Get assignments
            assignment_data = self.get_assignments(classroom_id)
            if not assignment_data:
                logger.warning("No assignments found")
                return
            
            # Filter by specific assignment ID if provided
            if self.config.assignment_id:
                assignment_data = [a for a in assignment_data if a[0] == self.config.assignment_id]
                logger.info(f"Filtered to specific assignment ID: {self.config.assignment_id}")
            
            # Process assignments
            consolidated_df = self.process_assignments_in_memory(assignment_data)
            
            if not consolidated_df.empty:
                logger.info(f"Sync completed successfully. Processed {len(consolidated_df)} grade records")
            else:
                logger.warning("Sync completed but no data was processed")
                
        except Exception as e:
            logger.error(f"Error during sync process: {e}")
            raise

def create_config_from_env() -> SyncConfig:
    """Create SyncConfig from environment variables."""
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'CLASSROOM_NAME']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {missing_vars}")
    
    # Check for GitHub token (optional but recommended)
    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        logger.warning("GITHUB_TOKEN not found. Repository information will be limited by rate limits.")
    
    return SyncConfig(
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_KEY'),
        classroom_name=os.getenv('CLASSROOM_NAME'),
        assignment_id=os.getenv('ASSIGNMENT_ID'),
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        max_retries=int(os.getenv('MAX_RETRIES', '3')),
        timeout_seconds=int(os.getenv('TIMEOUT_SECONDS', '30'))
    )

def main():
    """Main function to run the sync process."""
    try:
        config = create_config_from_env()
        sync_client = ClassroomSupabaseSync(config)
        sync_client.run_sync()
        logger.info("Sync process completed successfully")
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except (GitHubCLIError, SupabaseSyncError, DataValidationError) as e:
        logger.error(f"Sync error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

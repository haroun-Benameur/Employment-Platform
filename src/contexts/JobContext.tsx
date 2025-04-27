
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from './AuthContext';

// Define types
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  postedBy: string; // User ID
  postedDate: string;
  isActive: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  applicantName: string;
  coverLetter?: string;
  resume?: string;
  status: 'pending' | 'reviewed' | 'interview' | 'hired' | 'rejected';
  appliedDate: string;
}

interface JobContextType {
  jobs: Job[];
  applications: Application[];
  isLoading: boolean;
  getJob: (id: string) => Job | undefined;
  getApplicationsForJob: (jobId: string) => Application[];
  getUserApplications: () => Application[];
  createJob: (jobData: Omit<Job, 'id' | 'postedBy' | 'postedDate' | 'isActive'>) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<Job>) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  applyForJob: (jobId: string, applicationData: { coverLetter?: string, resume?: string }) => Promise<Application>;
  updateApplicationStatus: (applicationId: string, status: Application['status']) => Promise<Application>;
}

// Create context
const JobContext = createContext<JobContextType | undefined>(undefined);

interface JobProviderProps {
  children: ReactNode;
}

export const JobProvider: React.FC<JobProviderProps> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load jobs and applications from localStorage on mount
  useEffect(() => {
    const storedJobs = localStorage.getItem('hiresphere_jobs');
    const storedApplications = localStorage.getItem('hiresphere_applications');
    
    if (storedJobs) {
      setJobs(JSON.parse(storedJobs));
    } else {
      // Initialize with some sample jobs if none exist
      const sampleJobs = [
        {
          id: 'job_1',
          title: 'Frontend Developer',
          company: 'TechCorp',
          location: 'San Francisco, CA',
          description: 'We are looking for a skilled frontend developer to join our team.',
          requirements: ['3+ years of React experience', 'TypeScript knowledge', 'CSS/Tailwind skills'],
          salary: '$90,000 - $120,000',
          type: 'full-time',
          postedBy: 'user_1',
          postedDate: new Date().toISOString(),
          isActive: true
        },
        {
          id: 'job_2',
          title: 'UX Designer',
          company: 'DesignHub',
          location: 'Remote',
          description: 'Join our design team to create beautiful user experiences.',
          requirements: ['Portfolio of design work', 'Experience with Figma', 'User research skills'],
          salary: '$85,000 - $110,000',
          type: 'full-time',
          postedBy: 'user_2',
          postedDate: new Date().toISOString(),
          isActive: true
        },
        {
          id: 'job_3',
          title: 'Backend Engineer',
          company: 'DataSystems',
          location: 'New York, NY',
          description: 'Build robust backend systems for our growing platform.',
          requirements: ['Node.js expertise', 'Database design', 'API development'],
          salary: '$100,000 - $130,000',
          type: 'full-time',
          postedBy: 'user_3',
          postedDate: new Date().toISOString(),
          isActive: true
        }
      ] as Job[];
      
      setJobs(sampleJobs);
      localStorage.setItem('hiresphere_jobs', JSON.stringify(sampleJobs));
    }
    
    if (storedApplications) {
      setApplications(JSON.parse(storedApplications));
    }
    
    setIsLoading(false);
  }, []);

  // Get a specific job by ID
  const getJob = (id: string) => {
    return jobs.find(job => job.id === id);
  };

  // Get applications for a specific job
  const getApplicationsForJob = (jobId: string) => {
    return applications.filter(app => app.jobId === jobId);
  };

  // Get applications for the current user
  const getUserApplications = () => {
    if (!user) return [];
    return applications.filter(app => app.applicantId === user.id);
  };

  // Create a new job
  const createJob = async (jobData: Omit<Job, 'id' | 'postedBy' | 'postedDate' | 'isActive'>) => {
    if (!user) throw new Error('You must be logged in to post a job');
    if (user.role !== 'employer') throw new Error('Only employers can post jobs');
    
    try {
      const newJob: Job = {
        ...jobData,
        id: `job_${Date.now()}`,
        postedBy: user.id,
        postedDate: new Date().toISOString(),
        isActive: true
      };
      
      // Update state and localStorage
      const updatedJobs = [...jobs, newJob];
      setJobs(updatedJobs);
      localStorage.setItem('hiresphere_jobs', JSON.stringify(updatedJobs));
      
      toast({
        title: "Job created",
        description: "Your job listing has been posted successfully",
      });
      
      return newJob;
    } catch (error) {
      toast({
        title: "Failed to create job",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update an existing job
  const updateJob = async (id: string, jobData: Partial<Job>) => {
    if (!user) throw new Error('You must be logged in to update a job');
    
    try {
      const jobIndex = jobs.findIndex(job => job.id === id);
      if (jobIndex === -1) throw new Error('Job not found');
      
      const job = jobs[jobIndex];
      if (job.postedBy !== user.id) throw new Error('You can only edit your own job listings');
      
      const updatedJob = { ...job, ...jobData };
      const updatedJobs = [...jobs];
      updatedJobs[jobIndex] = updatedJob;
      
      // Update state and localStorage
      setJobs(updatedJobs);
      localStorage.setItem('hiresphere_jobs', JSON.stringify(updatedJobs));
      
      toast({
        title: "Job updated",
        description: "Your job listing has been updated successfully",
      });
      
      return updatedJob;
    } catch (error) {
      toast({
        title: "Failed to update job",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete a job
  const deleteJob = async (id: string) => {
    if (!user) throw new Error('You must be logged in to delete a job');
    
    try {
      const job = jobs.find(job => job.id === id);
      if (!job) throw new Error('Job not found');
      
      if (job.postedBy !== user.id) throw new Error('You can only delete your own job listings');
      
      // Update state and localStorage
      const updatedJobs = jobs.filter(job => job.id !== id);
      setJobs(updatedJobs);
      localStorage.setItem('hiresphere_jobs', JSON.stringify(updatedJobs));
      
      // Also remove associated applications
      const updatedApplications = applications.filter(app => app.jobId !== id);
      setApplications(updatedApplications);
      localStorage.setItem('hiresphere_applications', JSON.stringify(updatedApplications));
      
      toast({
        title: "Job deleted",
        description: "Your job listing has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to delete job",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Apply for a job
  const applyForJob = async (jobId: string, applicationData: { coverLetter?: string, resume?: string }) => {
    if (!user) throw new Error('You must be logged in to apply for a job');
    if (user.role !== 'jobseeker') throw new Error('Only job seekers can apply for jobs');
    
    try {
      const job = jobs.find(job => job.id === jobId);
      if (!job) throw new Error('Job not found');
      
      // Check if user already applied for this job
      const existingApplication = applications.find(
        app => app.jobId === jobId && app.applicantId === user.id
      );
      
      if (existingApplication) throw new Error('You have already applied for this job');
      
      const newApplication: Application = {
        id: `app_${Date.now()}`,
        jobId,
        applicantId: user.id,
        applicantName: user.name,
        coverLetter: applicationData.coverLetter,
        resume: applicationData.resume,
        status: 'pending',
        appliedDate: new Date().toISOString()
      };
      
      // Update state and localStorage
      const updatedApplications = [...applications, newApplication];
      setApplications(updatedApplications);
      localStorage.setItem('hiresphere_applications', JSON.stringify(updatedApplications));
      
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully",
      });
      
      return newApplication;
    } catch (error) {
      toast({
        title: "Failed to apply",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update application status
  const updateApplicationStatus = async (applicationId: string, status: Application['status']) => {
    if (!user) throw new Error('You must be logged in to update an application');
    
    try {
      const applicationIndex = applications.findIndex(app => app.id === applicationId);
      if (applicationIndex === -1) throw new Error('Application not found');
      
      const application = applications[applicationIndex];
      const job = jobs.find(job => job.id === application.jobId);
      
      // Check if user is the employer who posted the job
      if (!job || job.postedBy !== user.id) {
        throw new Error('You can only update applications for your own job listings');
      }
      
      const updatedApplication = { ...application, status };
      const updatedApplications = [...applications];
      updatedApplications[applicationIndex] = updatedApplication;
      
      // Update state and localStorage
      setApplications(updatedApplications);
      localStorage.setItem('hiresphere_applications', JSON.stringify(updatedApplications));
      
      toast({
        title: "Status updated",
        description: `Application status changed to ${status}`,
      });
      
      return updatedApplication;
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <JobContext.Provider value={{
      jobs,
      applications,
      isLoading,
      getJob,
      getApplicationsForJob,
      getUserApplications,
      createJob,
      updateJob,
      deleteJob,
      applyForJob,
      updateApplicationStatus
    }}>
      {children}
    </JobContext.Provider>
  );
};

// Custom hook for using job context
export const useJobs = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};

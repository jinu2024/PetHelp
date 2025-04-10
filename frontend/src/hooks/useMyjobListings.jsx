import { useEffect, useState } from "react";
import { useSetRecoilState, useRecoilValue } from "recoil";
import axios from "axios";
import { myJobsState } from "../recoil/jobAtom";

const useMyJobListings = () => {
  const setMyJobs = useSetRecoilState(myJobsState);
  const jobs = useRecoilValue(myJobsState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/jobs/my-posted-jobs`,
          { withCredentials: true }
        );
        setMyJobs(res.data);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [setMyJobs]);

  return { jobs, loading };
};

export default useMyJobListings;

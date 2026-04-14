// Modified useGetStats hook options to include the missing queryKey property.
const useGetStats = () => {
    const queryKey = 'stats'; // Define the queryKey property

    return useQuery([queryKey], fetchStats, {
        staleTime: 60000, // 1 minute stale time
        cacheTime: 300000, // 5 minutes cache time
        refetchOnWindowFocus: true,
    });
};

export default useGetStats;
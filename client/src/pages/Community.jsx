import { Heart, Loader2 } from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Community = () => {
  const [creations, setCreations] = useState([]);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState(null);
  const [animatedId, setAnimatedId] = useState(null);
  const { getToken } = useAuth();

  const fetchCreations = async () => {
    try {
      const { data } = await axios.get("/api/user/get-published-creations", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }

    setLoading(false);
  };

  const toggleLike = async (creationId) => {
    if (!user) {
      toast.error("Please sign in to like creations.");
      return;
    }

      setAnimatedId(creationId);

  setTimeout(() => {
    setAnimatedId(null);
  }, 300);

    // Optimistic update
    setCreations((prev) =>
      prev.map((c) => {
        if (c.id !== creationId) return c;
        const alreadyLiked = c.likes.includes(user.id);
        return {
          ...c,
          likes: alreadyLiked
            ? c.likes.filter((id) => id !== user.id)
            : [...c.likes, user.id],
        };
      })
    );

    try {
      setLikingId(creationId);
      const { data } = await axios.post(
        "/api/user/toggle-like-creation",
        { id: creationId },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (!data.success) {
        toast.error(data.message);
        fetchCreations(); // revert by re-syncing with server
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      fetchCreations(); // revert by re-syncing with server
    } finally {
      setLikingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCreations();
    }
  }, [user]);

  return (
    <div className="flex-1 h-full flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Creations</h1>

      <div className="bg-white h-full w-full rounded-xl overflow-y-auto p-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading creations...</p>
          </div>
        ) : creations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <Heart className="w-9 h-9" />
            <p className="text-sm">No published creations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creations.map((creation) => (
              <div
                key={creation.id}
                className="relative group rounded-lg overflow-hidden"
              >
                <img
                  src={creation.content}
                  alt={creation.prompt}
                  className="w-full h-72 object-cover rounded-lg"
                />

                <div
                  className="absolute inset-0 flex items-end justify-between
                  bg-gradient-to-t from-black/80 via-black/20 to-transparent
                  opacity-0 group-hover:opacity-100
                  transition duration-300 p-4 text-white"
                >
                  <p className="text-sm max-w-[70%]">{creation.prompt}</p>

                  <div className="flex items-center gap-1">
                    <p>{creation.likes.length}</p>

                    <Heart
                      onClick={() => toggleLike(creation.id)}
                      className={`w-5 h-5 cursor-pointer transition ${
                        likingId === creation.id ? "opacity-50" : ""
                      } ${
                        creation.likes.includes(user?.id)
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
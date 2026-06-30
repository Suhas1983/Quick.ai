import React, { useState } from "react";
import { Image, Sparkles, Download } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const styles = [
  "Realistic",
  "Ghibli style",
  "Anime style",
  "Cartoon style",
  "Fantasy style",
  "3D style",
  "Portrait style",
];

const GenerateImage = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Realistic");
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error("Please describe the image you want to generate.");
      return;
    }

    try {
      setLoading(true);

      const fullPrompt = `Generate an image of ${prompt} in the style ${selectedStyle}`;

      const { data } = await axios.post(
        "/api/ai/generate-image",
        { prompt: fullPrompt, publish },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (data.success) {
        setContent(data.content);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }

    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="flex flex-wrap gap-5">

        {/* Left Card */}
        <form
          onSubmit={onSubmitHandler}
          className="w-full lg:w-[440px] bg-white rounded-xl border border-gray-200 p-5"
        >

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-green-500" />
            <h1 className="text-2xl font-semibold text-slate-700">
              AI Image Generator
            </h1>
          </div>

          {/* Prompt */}
          <label className="text-sm font-medium text-slate-700">
            Describe Your Image
          </label>

          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to see in the image..."
            className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none resize-none focus:border-green-500"
            required
          />

          {/* Styles */}
          <h3 className="mt-6 mb-3 text-sm font-medium text-slate-700">
            Style
          </h3>

          <div className="flex flex-wrap gap-3">
            {styles.map((style) => (
              <button
                type="button"
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-4 py-1.5 rounded-full text-sm border transition
                  ${
                    selectedStyle === style
                      ? "border-green-500 text-green-600 bg-green-50"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {style}
              </button>
            ))}
          </div>

          <div className="my-6 flex items-center gap-2">
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) => setPublish(e.target.checked)}
                checked={publish}
                className="sr-only peer"
              />

              <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition"></div>

              <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition peer-checked:translate-x-4"></span>
            </label>
            <p className="text-sm">Make this image public</p>
          </div>

          {/* Button */}
          <button
            disabled={loading}
            className="mt-10 w-full bg-green-500 hover:bg-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition text-white py-3 rounded-lg flex justify-center items-center gap-2 font-medium"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            ) : (
              <Image className="w-5 h-5" />
            )}
            Generate Image
          </button>

        </form>

        {/* Right Card */}
        <div className="flex-1 min-w-[350px] bg-white rounded-xl border border-gray-200 p-5 flex flex-col">

          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-green-500" />
            <h1 className="text-2xl font-semibold text-slate-700">
              Generated image
            </h1>
          </div>

          {!content ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Image className="w-12 h-12 mx-auto mb-5" />
                <p>
                  Describe an image and click
                  <span className="font-medium"> "Generate Image" </span>
                  to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex-1 flex flex-col items-center justify-center gap-4">
              <img
                src={content}
                alt={prompt}
                className="max-h-[420px] w-auto rounded-lg border border-gray-200 object-contain"
              />
              <a
                href={content}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <Download className="w-4 h-4" />
                Download image
              </a>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default GenerateImage;
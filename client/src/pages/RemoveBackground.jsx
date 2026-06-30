import { Eraser, Sparkles, Download } from 'lucide-react';
import React, { useState } from 'react'
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const RemoveBackground = () => {
  const [input, setInput] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const { getToken } = useAuth();

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setInput(file);
    setContent('');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!input) {
      toast.error('Please upload an image first.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('image', input);

    const { data } = await axios.post(
  '/api/ai/remove-image-background',
  formData,
  {
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'multipart/form-data', // or just omit entirely and let browser set it
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
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">

      {/* Left Column */}
      <form onSubmit={onSubmitHandler} className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200">

        <div className="flex items-center gap-3">
          <Sparkles className="w-6 text-[#FF4938]" />
          <h1 className="text-xl font-semibold">
            Background Removal
          </h1>
        </div>

        <p className="mt-6 text-sm font-medium">
          Upload image
        </p>

        <input
          onChange={onFileChange}
          type="file"
          accept="image/*"
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600"
          required
        />
        <p className='text-xs text-gray-500 font-light mt-1'>Supports JPG, PNG, and other image formats</p>

        {previewUrl && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <img
              src={previewUrl}
              alt="Selected upload"
              className="max-h-40 rounded-md border border-gray-200 object-contain"
            />
          </div>
        )}

        <button
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#F6AB41] to-[#FF4938] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
          ) : (
            <Eraser className="w-5" />
          )}
          Remove background
        </button>

      </form>


      {/* Right Column */}
      <div className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 ">

        <div className="flex items-center gap-3">
          <Eraser className="w-5 h-5 text-[#FF4938]" />
          <h1 className="text-xl font-semibold">
            Processed Image
          </h1>
        </div>

        {!content ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
              <Eraser className="w-9 h-9" />
              <p>
                Upload an image and click "Remove Background" to get Started
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex-1 flex flex-col items-center justify-center gap-4">
            <img
              src={content}
              alt="Background removed"
              className="max-h-[420px] w-auto rounded-lg border border-gray-200 object-contain"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />
            <a
              href={content}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-[#FF4938] hover:opacity-80 font-medium"
            >
              <Download className="w-4 h-4" />
              Download image
            </a>
          </div>
        )}

      </div>

    </div>
  )
}

export default RemoveBackground
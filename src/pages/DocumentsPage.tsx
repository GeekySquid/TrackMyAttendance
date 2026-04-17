import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, Download, MoreVertical, Search, Plus, Trash2, X } from 'lucide-react';
import { listenToCollection, addDocument, deleteDocument } from '../services/dbService';

export default function DocumentsPage({ user }: { user?: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success'|'error'|'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = listenToCollection('documents', (data) => {
      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocuments(sorted);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Safety check for demo environment storage limits (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Please upload files smaller than 2MB limit for this demo.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;

      // Format file size
      let size = file.size;
      let sizeStr = `${size} B`;
      if (size > 1024 * 1024) {
        sizeStr = `${(size / (1024 * 1024)).toFixed(1)} MB`;
      } else if (size > 1024) {
        sizeStr = `${(size / 1024).toFixed(1)} KB`;
      }

      const newDoc = {
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: sizeStr,
        date: new Date().toISOString(),
        uploader: user?.data?.name || 'Admin',
        uploaderId: user?.data?.uid || 'admin',
        fileData: base64Data // Store the actual file contents (Data URL)
      };

      try {
        await addDocument(newDoc);
        showNotification("File uploaded successfully!");
      } catch (error) {
        console.error("Error uploading document:", error);
        showNotification("Failed to upload file. Data may be too large.", "error");
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      await deleteDocument(documentToDelete);
      showNotification("Document deleted successfully!");
    } catch (error) {
      console.error("Error deleting document:", error);
      showNotification("Failed to delete document.", "error");
    }
    setDocumentToDelete(null);
  };

  const handleDeleteClick = (id: string) => {
    setDocumentToDelete(id);
    setActiveDropdown(null);
  };

  const handleDownload = (doc: any) => {
    if (doc.fileData) {
      // If we have actual file data, download it correctly!
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback for older simulated files if any exist
      showNotification("Demo file: Downloading as text.", "info");
      const content = `This is a simulated download for ${doc.name}\nUploaded by: ${doc.uploader}\nDate: ${new Date(doc.date).toLocaleDateString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Force it to a .txt extension to avoid "Invalid Format" errors on systems
      link.download = `${doc.name}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.uploader || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[200] px-6 py-3 rounded-lg shadow-lg text-sm font-bold animate-in slide-in-from-top-2 ${
          notification.type === 'error' ? 'bg-red-500 text-white' :
          notification.type === 'info' ? 'bg-blue-500 text-white' :
          'bg-green-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Document</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to permanently delete this document? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDocumentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Documents</h2>
          <p className="text-sm text-gray-500">Manage your files and documents</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-blue-600 text-white text-xs py-2.5 px-6 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload File
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase">Size</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase">Date Modified</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase">Uploaded By</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">No documents found. Click 'Upload File' to add one.</td>
                </tr>
              )}
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {doc.type === 'Folder' ? (
                        <Folder className="w-5 h-5 text-blue-500 fill-blue-100 shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <span className="text-sm font-bold text-gray-800 truncate max-w-[200px] sm:max-w-[300px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">{doc.size}</td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(doc.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">{doc.uploader}</td>
                  <td className="py-4 px-6 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      {doc.type !== 'Folder' && (
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === doc.id ? null : doc.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {activeDropdown === doc.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-36 bg-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 z-[100] py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(doc.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

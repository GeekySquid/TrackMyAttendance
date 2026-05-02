import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, Download, MoreVertical, Search, Plus, Trash2, X, FileText, FileSpreadsheet, FileIcon as FilePdf, Image as ImageIcon, History, Clock, User, Eye, Share2 } from 'lucide-react';
import { listenToCollection, addDocument, deleteDocument, removeDocumentRevision } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export default function DocumentsPage({ user }: { user?: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null); // For history view
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        showNotification(`${file.name} is too large (>5MB).`, 'error');
        return resolve(null);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        let size = file.size;
        let sizeStr = `${size} B`;
        if (size > 1024 * 1024) sizeStr = `${(size / (1024 * 1024)).toFixed(1)} MB`;
        else if (size > 1024) sizeStr = `${(size / 1024).toFixed(1)} KB`;

        resolve({
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          size: sizeStr,
          size_bytes: file.size,
          uploader: user?.data?.name || 'Admin',
          uploaderId: user?.data?.uid || 'admin',
          fileData: base64Data
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of files) {
      const docToUpload = await processFile(file);
      if (docToUpload) {
        try {
          await addDocument(docToUpload);
          successCount++;
        } catch (error) {
          console.error("Error uploading:", file.name, error);
        }
      }
    }

    if (successCount > 0) {
      showNotification(`Successfully uploaded ${successCount} file(s)!`);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateFile = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docToUpload = await processFile(file);
    if (docToUpload) {
      try {
        // We'll use addDocument with an update logic in dbService if we want versioning
        // For now, let's just upload it as a new version or new record
        // The requirement is "Modified in future with proper track record"
        // I will implement a dedicated updateDocument later, but for now let's use addDocument
        await addDocument({ ...docToUpload, isReplacement: true, originalId: docId });
        showNotification("Document updated/replaced successfully!");
      } catch (error) {
        showNotification("Failed to update document.", "error");
      }
    }
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    setActiveDropdown(null);
  };

  const getFileIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') return <FilePdf className="w-5 h-5 text-red-500" />;
    if (['xls', 'xlsx', 'csv'].includes(t)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['doc', 'docx', 'word', 'txt'].includes(t)) return <FileText className="w-5 h-5 text-blue-500" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(t)) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '---';
    const date = new Date(dateValue);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'Recently Uploaded';
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleDownload = async (doc: any) => {
    if (doc.fileData) {
      try {
        const response = await fetch(doc.fileData);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } catch (e) {
        // Fallback for cross-origin or fetch errors
        const link = document.createElement('a');
        link.href = doc.fileData;
        link.download = doc.name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // Fallback for older simulated files
      showNotification("Legacy file: Downloading as text.", "info");
      const content = `This is a simulated download for ${doc.name}\nUploaded by: ${doc.uploader}\nDate: ${new Date(doc.date).toLocaleDateString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
 
  const handleShare = async (doc: any) => {
    const shareData = {
      title: doc.name,
      text: `Check out this document: ${doc.name}`,
      url: doc.fileData || window.location.href
    };
 
    if (navigator.share && doc.fileData) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn("Share failed, copying to clipboard instead");
        copyToClipboard(doc.fileData);
      }
    } else {
      copyToClipboard(doc.fileData || window.location.href);
    }
  };
 
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification("Link copied to clipboard!");
  };
 
  const handleRemoveRevision = async (docId: string, idx: number) => {
    try {
      await removeDocumentRevision(docId, idx);
      showNotification("Revision removed successfully!");
    } catch (error) {
      showNotification("Failed to remove revision.", "error");
    }
  };
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.uploader || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { visibleItems, sentinelRef } = useInfiniteScroll(filteredDocuments, 10, 5);

  return (
    <div className="flex-1 mobile-container-padding relative min-h-screen">
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
            multiple
          />
          <input 
            type="file" 
            ref={replaceInputRef} 
            onChange={(e) => selectedDoc && handleUpdateFile(e, selectedDoc.id)}
            className="hidden" 
          />
          <button 
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-blue-600 text-white text-xs py-2.5 px-6 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {isUploading ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {isUploading ? 'Uploading...' : 'Upload Files'}
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
        <div className="table-fixed-height">
          <table className="w-full text-left border-collapse table-responsive">
            <thead className="sticky top-0 z-10 bg-gray-50/50 backdrop-blur-md">
              <tr className="border-b border-gray-100">
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
              {visibleItems.map((doc) => (
                <tr key={doc.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6" data-label="Name">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.type)}
                      <span className="text-sm font-bold text-gray-800 truncate max-w-[200px] sm:max-w-[300px] text-left">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap" data-label="Size">{doc.size}</td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap" data-label="Date Modified">
                    {formatDate(doc.date)}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap" data-label="Uploaded By">{doc.uploader}</td>
                  <td className="py-4 px-6 text-right relative" data-label="Actions">
                    <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {/* Primary Actions (Always Visible on this row) */}
                      <button 
                        onClick={() => setSelectedDoc(doc)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Track Record"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {doc.type !== 'Folder' && (
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* Revealed Actions on Mobile (Always) / Hover on Desktop */}
                      <div className="flex items-center gap-1.5 animate-in slide-in-from-right-1 duration-200">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(doc);
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            replaceInputRef.current?.click();
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Update / Replace"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(doc.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={sentinelRef} className="h-4" />
        </div>
      </div>

      {/* History / Track Record Sidebar/Modal */}
      {selectedDoc && !replaceInputRef.current?.files?.length && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Track Record</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">History of {selectedDoc.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-8">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Current Version</p>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">{getFileIcon(selectedDoc.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{selectedDoc.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(selectedDoc.date).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {selectedDoc.uploader}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Revision History</p>
                {(!selectedDoc.revisions || selectedDoc.revisions.length === 0) ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-gray-300">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-500">No previous versions available.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                    {selectedDoc.revisions.map((rev: any, idx: number) => (
                      <div key={idx} className="relative pl-8">
                        <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-white border-2 border-blue-400 z-10" />
                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-blue-200 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">v.{selectedDoc.revisions.length - idx}</span>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleShare(rev)}
                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Share"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDownload({ ...rev, name: `v${selectedDoc.revisions.length - idx}_${selectedDoc.name}` })}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Download this version"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleRemoveRevision(selectedDoc.id, idx)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Remove version"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-gray-800 line-clamp-1">{rev.name}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <User className="w-2.5 h-2.5" />
                              {rev.uploader}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Plus className="w-2.5 h-2.5 text-green-500" />
                              {new Date(rev.date).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button 
                onClick={() => handleDownload(selectedDoc)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-gray-200 hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Current Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

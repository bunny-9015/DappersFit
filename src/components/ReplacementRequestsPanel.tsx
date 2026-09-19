/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, 
  Camera, Upload, Eye, Edit3, Trash2, Phone, MessageSquare, 
  ArrowRightLeft, Package, MapPin, Check, X, ShieldAlert, Image as ImageIcon,
  ExternalLink, Download, Flag, Sparkles, ChevronDown, Zap
} from 'lucide-react';
import { ReplacementRequest, ReplacementFlag, AiParsedReplacement } from '../types';

interface ReplacementRequestsPanelProps {
  user?: { name: string; email: string; role: 'admin' | 'employee' } | null;
}

export const FLAG_CONFIG: Record<ReplacementFlag, {
  label: string;
  sub: string;
  colorName: string;
  badgeClass: string;
  iconClass: string;
  activeBtn: string;
  dotClass: string;
}> = {
  red: {
    label: 'Red Flag',
    sub: 'Urgent / Defect Escalation',
    colorName: 'Red',
    badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    iconClass: 'text-rose-400 fill-rose-400/30',
    activeBtn: 'border-rose-500 bg-rose-500/20 text-rose-300',
    dotClass: 'bg-rose-500'
  },
  orange: {
    label: 'Orange Flag',
    sub: 'Review / Address Pending',
    colorName: 'Orange',
    badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    iconClass: 'text-amber-400 fill-amber-400/30',
    activeBtn: 'border-amber-500 bg-amber-500/20 text-amber-300',
    dotClass: 'bg-amber-500'
  },
  green: {
    label: 'Green Flag',
    sub: 'Routine / Verified',
    colorName: 'Green',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    iconClass: 'text-emerald-400 fill-emerald-400/30',
    activeBtn: 'border-emerald-500 bg-emerald-500/20 text-emerald-300',
    dotClass: 'bg-emerald-500'
  },
  none: {
    label: 'No Flag',
    sub: 'Standard',
    colorName: 'None',
    badgeClass: 'bg-white/5 border-white/10 text-slate-400',
    iconClass: 'text-slate-500',
    activeBtn: 'border-slate-500 bg-white/10 text-slate-300',
    dotClass: 'bg-slate-500'
  }
};

export default function ReplacementRequestsPanel({ user }: ReplacementRequestsPanelProps) {
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string; sku: string }>>([]);

  // Search and filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'done' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'replacement' | 'exchange'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'red' | 'orange' | 'green' | 'none'>('all');

  // Quick flag popover dropdown
  const [quickFlagMenuId, setQuickFlagMenuId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [activePhotoTitle, setActivePhotoTitle] = useState('');

  // AI Phase state
  const [showAiPhaseModal, setShowAiPhaseModal] = useState(false);
  const [aiRawText, setAiRawText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParsedResult, setAiParsedResult] = useState<AiParsedReplacement | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isCreatingFromAi, setIsCreatingFromAi] = useState(false);

  // In-modal quick AI autofill expander
  const [showInModalAi, setShowInModalAi] = useState(false);
  const [inModalAiText, setInModalAiText] = useState('');
  const [inModalAiLoading, setInModalAiLoading] = useState(false);

  // Editing state
  const [selectedItem, setSelectedItem] = useState<ReplacementRequest | null>(null);

  // Form states for New / Edit
  const [formData, setFormData] = useState({
    type: 'replacement' as 'replacement' | 'exchange',
    customerName: '',
    customerPhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    orderNumber: '',
    productName: '',
    productSku: '',
    reason: '',
    notes: '',
    flag: 'green' as ReplacementFlag,
    flagReason: '',
    photoBase64: '',
    photoUrl: ''
  });

  // Photo upload modal state
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [uploadPhotoBase64, setUploadPhotoBase64] = useState('');
  const [uploadPhotoPreview, setUploadPhotoPreview] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Notification feedback
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const modalCameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch all replacements
  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/replacements');
      const data = await res.json();
      if (Array.isArray(data.replacements)) {
        setReplacements(data.replacements);
      }
    } catch (err) {
      console.error('Failed to load replacement requests:', err);
      showToast('Failed to load replacement requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for dropdown autocomplete
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProductsList(data.products);
      }
    } catch (err) {
      console.error('Failed to load products list:', err);
    }
  };

  useEffect(() => {
    fetchReplacements();
    fetchProducts();
  }, []);

  // Filter replacements
  const filteredReplacements = replacements.filter((item) => {
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }
    // Flag filter
    if (flagFilter !== 'all' && (item.flag || 'none') !== flagFilter) {
      return false;
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchPhone = item.customerPhone?.toLowerCase().includes(q);
      const matchTicket = item.ticketNumber?.toLowerCase().includes(q);
      const matchOrder = item.orderNumber?.toLowerCase().includes(q);
      const matchProduct = item.productName?.toLowerCase().includes(q);
      const matchSku = item.productSku?.toLowerCase().includes(q);
      const matchReason = item.reason?.toLowerCase().includes(q);
      const matchFlag = item.flag?.toLowerCase().includes(q) || item.flagReason?.toLowerCase().includes(q);
      return matchName || matchPhone || matchTicket || matchOrder || matchProduct || matchSku || matchReason || matchFlag;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = replacements.length;
  const pendingCount = replacements.filter(r => r.status === 'pending').length;
  const approvedCount = replacements.filter(r => r.status === 'approved').length;
  const doneCount = replacements.filter(r => r.status === 'done').length;
  const redFlagCount = replacements.filter(r => r.flag === 'red').length;
  const orangeFlagCount = replacements.filter(r => r.flag === 'orange').length;
  const greenFlagCount = replacements.filter(r => r.flag === 'green').length;

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      type: 'replacement',
      customerName: '',
      customerPhone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      orderNumber: '',
      productName: productsList[0]?.name || '',
      productSku: productsList[0]?.sku || '',
      reason: '',
      notes: '',
      flag: 'green',
      flagReason: '',
      photoBase64: '',
      photoUrl: ''
    });
    setShowInModalAi(false);
    setInModalAiText('');
    setShowAddModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (item: ReplacementRequest) => {
    setSelectedItem(item);
    setFormData({
      type: item.type,
      customerName: item.customerName || '',
      customerPhone: item.customerPhone || '',
      address: item.customerAddress?.address || '',
      city: item.customerAddress?.city || '',
      state: item.customerAddress?.state || '',
      pincode: item.customerAddress?.pincode || '',
      orderNumber: item.orderNumber || '',
      productName: item.productName || '',
      productSku: item.productSku || '',
      reason: item.reason || '',
      notes: item.notes || '',
      flag: item.flag || 'none',
      flagReason: item.flagReason || '',
      photoBase64: '',
      photoUrl: item.photoUrl || ''
    });
    setShowEditModal(true);
  };

  // Handle Quick Flag Update directly from the list table
  const handleQuickFlagChange = async (item: ReplacementRequest, newFlag: ReplacementFlag) => {
    try {
      const res = await fetch(`/api/replacements/${item.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: newFlag })
      });
      const data = await res.json();
      if (data.success) {
        setReplacements(prev => prev.map(r => r.id === item.id ? { ...r, flag: newFlag } : r));
        showToast(`Flag updated to ${FLAG_CONFIG[newFlag]?.label || newFlag.toUpperCase()} for ${item.ticketNumber}`);
      } else {
        showToast(data.error || 'Failed to update flag', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error updating flag', 'error');
    } finally {
      setQuickFlagMenuId(null);
    }
  };

  // Handle AI Phase execution
  const handleRunAiPhase = async (textToParse?: string) => {
    const input = textToParse !== undefined ? textToParse : aiRawText;
    if (!input.trim()) {
      setAiError('Please enter or paste raw replacement data first.');
      return;
    }

    setIsAiParsing(true);
    setAiError(null);

    try {
      const res = await fetch('/api/replacements/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setAiParsedResult(data.parsed);
        showToast('AI Phase intake completed successfully!');
      } else {
        setAiError(data.error || 'Failed to parse raw data with AI');
      }
    } catch (err: any) {
      console.error('AI Phase error:', err);
      setAiError(err.message || 'Error running AI Phase parsing');
    } finally {
      setIsAiParsing(false);
    }
  };

  // Quick In-Modal AI auto-fill
  const handleApplyInModalAi = async () => {
    if (!inModalAiText.trim()) return;
    setInModalAiLoading(true);
    try {
      const res = await fetch('/api/replacements/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inModalAiText })
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        const p = data.parsed as AiParsedReplacement;
        setFormData(prev => ({
          ...prev,
          type: p.type || prev.type,
          customerName: p.customerName || prev.customerName,
          customerPhone: p.customerPhone || prev.customerPhone,
          address: p.address || prev.address,
          city: p.city || prev.city,
          state: p.state || prev.state,
          pincode: p.pincode || prev.pincode,
          orderNumber: p.orderNumber || prev.orderNumber,
          productName: p.productName || prev.productName,
          productSku: p.productSku || prev.productSku,
          reason: p.reason || prev.reason,
          notes: p.notes || prev.notes,
          flag: p.flag || prev.flag,
          flagReason: p.flagReason || prev.flagReason
        }));
        showToast('Form auto-filled from AI phase!');
        setShowInModalAi(false);
      } else {
        showToast(data.error || 'AI parsing failed', 'error');
      }
    } catch (err: any) {
      showToast('Error in AI auto-fill: ' + err.message, 'error');
    } finally {
      setInModalAiLoading(false);
    }
  };

  // Load parsed AI data into manual Add form
  const handleLoadAiIntoForm = () => {
    if (!aiParsedResult) return;
    setFormData({
      type: aiParsedResult.type || 'replacement',
      customerName: aiParsedResult.customerName || '',
      customerPhone: aiParsedResult.customerPhone || '',
      address: aiParsedResult.address || '',
      city: aiParsedResult.city || '',
      state: aiParsedResult.state || '',
      pincode: aiParsedResult.pincode || '',
      orderNumber: aiParsedResult.orderNumber || '',
      productName: aiParsedResult.productName || productsList[0]?.name || '',
      productSku: aiParsedResult.productSku || productsList[0]?.sku || '',
      reason: aiParsedResult.reason || '',
      notes: aiParsedResult.notes || '',
      flag: aiParsedResult.flag || 'green',
      flagReason: aiParsedResult.flagReason || '',
      photoBase64: '',
      photoUrl: ''
    });
    setShowAiPhaseModal(false);
    setShowAddModal(true);
    showToast('AI parsed data loaded into form. Ready to review & save.');
  };

  // Create directly from AI Phase without opening manual form
  const handleCreateFromAiDirectly = async () => {
    if (!aiParsedResult) return;
    // Phone is strictly mandatory
    if (!aiParsedResult.customerPhone?.trim()) {
      showToast('Customer phone number is mandatory! Please provide phone in raw text.', 'error');
      return;
    }
    if (!aiParsedResult.customerName?.trim() || !aiParsedResult.productName?.trim() || !aiParsedResult.reason?.trim()) {
      showToast('Please ensure Customer Name, Product, and Reason are present.', 'error');
      return;
    }

    setIsCreatingFromAi(true);
    try {
      const payload = {
        type: aiParsedResult.type || 'replacement',
        customerName: aiParsedResult.customerName,
        customerPhone: aiParsedResult.customerPhone,
        customerAddress: {
          address: aiParsedResult.address || '',
          city: aiParsedResult.city || '',
          state: aiParsedResult.state || '',
          pincode: aiParsedResult.pincode || ''
        },
        orderNumber: aiParsedResult.orderNumber || '',
        productName: aiParsedResult.productName,
        productSku: aiParsedResult.productSku || '',
        reason: aiParsedResult.reason,
        notes: aiParsedResult.notes || '',
        flag: aiParsedResult.flag || 'green',
        flagReason: aiParsedResult.flagReason || '',
        createdBy: user?.name || user?.email || 'Staff (AI Phase)'
      };

      const res = await fetch('/api/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Request ${data.replacement.ticketNumber} created directly from AI Phase!`);
        setShowAiPhaseModal(false);
        setAiParsedResult(null);
        setAiRawText('');
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to create request', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error creating request', 'error');
    } finally {
      setIsCreatingFromAi(false);
    }
  };

  // Handle Create Request Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Phone number is strictly mandatory
    if (!formData.customerPhone.trim()) {
      showToast('Customer phone number is mandatory *', 'error');
      return;
    }

    if (!formData.customerName.trim() || !formData.productName.trim() || !formData.reason.trim()) {
      showToast('Please fill in customer name, product, and issue/reason.', 'error');
      return;
    }

    try {
      const payload = {
        type: formData.type,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        // Address is optional
        customerAddress: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        orderNumber: formData.orderNumber,
        productName: formData.productName,
        productSku: formData.productSku,
        reason: formData.reason,
        notes: formData.notes,
        flag: formData.flag,
        flagReason: formData.flagReason,
        photoBase64: formData.photoBase64 || undefined,
        photoUrl: formData.photoUrl || undefined,
        createdBy: user?.name || user?.email || 'Staff'
      };

      const res = await fetch('/api/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Request ${data.replacement.ticketNumber} created successfully.`);
        setShowAddModal(false);
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to create request', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error creating request', 'error');
    }
  };

  // Handle Edit Request Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    // Phone number is strictly mandatory
    if (!formData.customerPhone.trim()) {
      showToast('Customer phone number is mandatory *', 'error');
      return;
    }

    try {
      const payload = {
        type: formData.type,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        // Address is optional
        customerAddress: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        orderNumber: formData.orderNumber,
        productName: formData.productName,
        productSku: formData.productSku,
        reason: formData.reason,
        notes: formData.notes,
        flag: formData.flag,
        flagReason: formData.flagReason,
        photoBase64: formData.photoBase64 || undefined,
        photoUrl: formData.photoUrl || undefined
      };

      const res = await fetch(`/api/replacements/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Request ${selectedItem.ticketNumber} updated successfully.`);
        setShowEditModal(false);
        setSelectedItem(null);
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to update request', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error updating request', 'error');
    }
  };

  // Handle Admin Status Update (Approve, Reject, Done)
  const handleUpdateStatus = async (item: ReplacementRequest, newStatus: 'approved' | 'rejected' | 'done') => {
    let confirmPrompt = `Are you sure you want to mark ${item.ticketNumber} as ${newStatus.toUpperCase()}?`;
    if (newStatus === 'done') {
      confirmPrompt = `Mark ${item.ticketNumber} as COMPLETED / DONE?`;
    }

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    try {
      const res = await fetch(`/api/replacements/${item.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          userEmail: user?.email || 'admin@dappersfit.com',
          userName: user?.name || 'Admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`${item.ticketNumber} status updated to ${newStatus.toUpperCase()}!`);
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error updating status', 'error');
    }
  };

  // Handle Open Photo Upload Modal for any item
  const handleOpenPhotoModal = (item: ReplacementRequest) => {
    setPhotoTargetId(item.id);
    setSelectedItem(item);
    setUploadPhotoBase64('');
    setUploadPhotoPreview(item.photoUrl || '');
    setShowPhotoModal(true);
  };

  // Handle Save Uploaded Photo
  const handleSaveUploadedPhoto = async () => {
    if (!photoTargetId) return;
    if (!uploadPhotoBase64 && !uploadPhotoPreview) {
      showToast('Please select or capture an image first.', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await fetch(`/api/replacements/${photoTargetId}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64: uploadPhotoBase64 || undefined,
          photoUrl: uploadPhotoPreview || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Photo uploaded and updated successfully!');
        setShowPhotoModal(false);
        setPhotoTargetId(null);
        setUploadPhotoBase64('');
        setUploadPhotoPreview('');
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error uploading photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

    // Helper to compress image
  const compressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1000;
        if (width > height && width > max_size) {
          height *= max_size / width;
          width = max_size;
        } else if (height > max_size) {
          width *= max_size / height;
          height = max_size;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          callback(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          callback(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle File Input selection for main form
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (result) => {
        setFormData(prev => ({ ...prev, photoBase64: result, photoUrl: result }));
      });
    }
  };

    // Handle File Input selection for Photo Upload Modal
  const handleModalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (result) => {
        setUploadPhotoBase64(result);
        setUploadPhotoPreview(result);
      });
    }
  };

  // Handle Delete
  const handleDelete = async (item: ReplacementRequest) => {
    if (!window.confirm(`Permanently delete replacement ticket ${item.ticketNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/replacements/${item.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Ticket ${item.ticketNumber} deleted.`);
        fetchReplacements();
      } else {
        showToast(data.error || 'Failed to delete ticket', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error deleting ticket', 'error');
    }
  };

  // Open Lightbox
  const handleViewPhoto = (photoUrl: string, title: string) => {
    setActivePhotoUrl(photoUrl);
    setActivePhotoTitle(title);
    setShowLightbox(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" id="replacement-requests-panel">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs font-mono font-medium border ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
          }`}
          id="replacement-toast"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1c1b1a] border border-[#2a2826] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#b8862f]/10 border border-[#b8862f]/30 flex items-center justify-center text-[#b8862f] shadow-sm">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">Replacement & Exchange Requests</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#b8862f]/20 border border-[#b8862f]/40 text-[#dfad56] font-bold">
                Fulfillment Row
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage customer defect replacements, size exchanges, defect photo uploads, and admin approval workflows.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchReplacements}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-2 transition"
            title="Refresh Requests"
            id="refresh-replacements-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#b8862f]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* AI Phase Intake Button */}
          <button
            onClick={() => {
              setAiRawText('');
              setAiParsedResult(null);
              setAiError(null);
              setShowAiPhaseModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center space-x-2 shadow-sm transition group"
            title="Open AI Phase: Paste raw text from chat/SMS/email to auto-fill"
            id="open-ai-phase-btn"
          >
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>AI Phase Intake</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#b8862f] hover:bg-[#a37526] text-white text-xs font-bold flex items-center space-x-2 shadow-md transition"
            id="new-replacement-btn"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards (Including Color Flags) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" id="replacement-kpi-grid">
        <div className="bg-[#1c1b1a] border border-[#2a2826] p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-400 block uppercase">Total Requests</span>
            <span className="text-lg font-bold text-white font-mono">{totalCount}</span>
          </div>
        </div>

        {/* Red Flag Card */}
        <div 
          onClick={() => setFlagFilter(flagFilter === 'red' ? 'all' : 'red')}
          className={`p-3.5 rounded-xl flex items-center space-x-3 cursor-pointer transition border ${
            flagFilter === 'red' ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/50' : 'bg-[#1c1b1a] border-rose-500/30 hover:border-rose-500/60'
          }`}
          title="Filter by Red Flag (Urgent defect / escalation)"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Flag className="w-4 h-4 fill-rose-500/30" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-rose-300 block uppercase font-mono">Red Flag (Urgent)</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{redFlagCount}</span>
          </div>
        </div>

        {/* Orange Flag Card */}
        <div 
          onClick={() => setFlagFilter(flagFilter === 'orange' ? 'all' : 'orange')}
          className={`p-3.5 rounded-xl flex items-center space-x-3 cursor-pointer transition border ${
            flagFilter === 'orange' ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50' : 'bg-[#1c1b1a] border-amber-500/30 hover:border-amber-500/60'
          }`}
          title="Filter by Orange Flag (Review / Pending address)"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flag className="w-4 h-4 fill-amber-500/30" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-amber-300 block uppercase font-mono">Orange Flag (Review)</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{orangeFlagCount}</span>
          </div>
        </div>

        {/* Green Flag Card */}
        <div 
          onClick={() => setFlagFilter(flagFilter === 'green' ? 'all' : 'green')}
          className={`p-3.5 rounded-xl flex items-center space-x-3 cursor-pointer transition border ${
            flagFilter === 'green' ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50' : 'bg-[#1c1b1a] border-emerald-500/30 hover:border-emerald-500/60'
          }`}
          title="Filter by Green Flag (Routine / Verified)"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Flag className="w-4 h-4 fill-emerald-500/30" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-emerald-300 block uppercase font-mono">Green Flag (Routine)</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{greenFlagCount}</span>
          </div>
        </div>

        <div className="bg-[#1c1b1a] border border-amber-500/20 p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-amber-300/80 block uppercase">Pending Review</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-[#1c1b1a] border border-emerald-500/20 p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-medium text-emerald-300/80 block uppercase">Marked Done</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{doneCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1c1b1a] border border-[#2a2826] p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket #, customer, phone, product, or order #..."
            className="w-full bg-[#141312] border border-[#2a2826] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] transition"
            id="search-replacements-input"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Flag Filter Pills */}
          <div className="flex items-center bg-[#141312] border border-[#2a2826] p-1 rounded-lg">
            {(['all', 'red', 'orange', 'green'] as const).map((fg) => {
              const label = fg === 'all' ? 'All Flags' : fg === 'red' ? '🔴 Red' : fg === 'orange' ? '🟠 Orange' : '🟢 Green';
              return (
                <button
                  key={fg}
                  onClick={() => setFlagFilter(fg)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                    flagFilter === fg
                      ? 'bg-white/15 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-[#141312] border border-[#2a2826] p-1 rounded-lg">
            {(['all', 'pending', 'approved', 'done', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition ${
                  statusFilter === st
                    ? 'bg-[#b8862f] text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-[#141312] border border-[#2a2826] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#b8862f]"
          >
            <option value="all">All Types</option>
            <option value="replacement">Replacements</option>
            <option value="exchange">Exchanges</option>
          </select>
        </div>
      </div>

      {/* Main Table / Records */}
      <div className="bg-[#1c1b1a] border border-[#2a2826] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-[#b8862f] animate-spin" />
            <span className="text-xs font-mono">Loading replacement requests...</span>
          </div>
        ) : filteredReplacements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No replacement or exchange requests found</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {search || statusFilter !== 'all' || typeFilter !== 'all' || flagFilter !== 'all'
                ? 'Try adjusting your search criteria or filter options.'
                : 'Click "+ New Request" or "AI Phase Intake" to log a customer replacement or exchange ticket.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2826] bg-[#141312]/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Ticket & Type</th>
                  <th className="py-3 px-4">Priority Flag</th>
                  <th className="py-3 px-4">Defect Photo</th>
                  <th className="py-3 px-4">Customer & Order</th>
                  <th className="py-3 px-4">Product & Issue</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2826]/60 text-xs">
                {filteredReplacements.map((item) => {
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved';
                  const isDone = item.status === 'done';
                  const isRejected = item.status === 'rejected';

                  const flagKey = (item.flag || 'none') as ReplacementFlag;
                  const cfg = FLAG_CONFIG[flagKey] || FLAG_CONFIG.none;
                  const isFlagMenuOpen = quickFlagMenuId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Ticket & Type */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-bold text-white text-xs">{item.ticketNumber}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          item.type === 'exchange'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          {item.type}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Priority Flag (Red, Orange, Green) with Quick Changer */}
                      <td className="py-3.5 px-4 align-top relative">
                        <div className="flex flex-col items-start space-y-1">
                          <button
                            type="button"
                            onClick={() => setQuickFlagMenuId(isFlagMenuOpen ? null : item.id)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${cfg.badgeClass} hover:opacity-90 cursor-pointer`}
                            title="Click to change flag color (Red, Orange, Green)"
                          >
                            <Flag className={`w-3.5 h-3.5 ${cfg.iconClass}`} />
                            <span>{cfg.label}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                          </button>

                          {item.flagReason && (
                            <span className="text-[10px] text-slate-400 italic line-clamp-1 max-w-[130px]" title={item.flagReason}>
                              {item.flagReason}
                            </span>
                          )}

                          {/* Quick Flag Dropdown Popover */}
                          {isFlagMenuOpen && (
                            <div className="absolute left-4 top-10 z-40 bg-[#1c1b1a] border border-[#2a2826] rounded-xl shadow-2xl p-1.5 w-44 space-y-1 animate-fade-in">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-0.5">
                                Set Priority Flag
                              </div>
                              {(['red', 'orange', 'green', 'none'] as ReplacementFlag[]).map((fOption) => {
                                const optCfg = FLAG_CONFIG[fOption];
                                const isSelected = (item.flag || 'none') === fOption;
                                return (
                                  <button
                                    key={fOption}
                                    type="button"
                                    onClick={() => handleQuickFlagChange(item, fOption)}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center space-x-2 transition ${
                                      isSelected ? optCfg.activeBtn : 'text-slate-300 hover:bg-white/5'
                                    }`}
                                  >
                                    <Flag className={`w-3.5 h-3.5 ${optCfg.iconClass}`} />
                                    <div className="flex-1">
                                      <div className="font-semibold text-[11px]">{optCfg.label}</div>
                                      <div className="text-[9px] text-slate-400">{optCfg.sub}</div>
                                    </div>
                                    {isSelected && <Check className="w-3 h-3 text-[#dfad56]" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Photo Thumbnail & Anytime Upload */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col items-start space-y-1.5">
                          {item.photoUrl ? (
                            <div className="relative group/photo">
                              <img
                                src={item.photoUrl}
                                alt="Defect proof"
                                className="w-16 h-16 object-cover rounded-lg border border-white/10 shadow-sm cursor-pointer hover:opacity-90 transition"
                                onClick={() => handleViewPhoto(item.photoUrl!, `${item.ticketNumber} - ${item.productName}`)}
                                title="Click to view full photo"
                              />
                              <button
                                onClick={() => handleViewPhoto(item.photoUrl!, `${item.ticketNumber} - ${item.productName}`)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center rounded-lg text-white transition"
                                title="Enlarge photo"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleOpenPhotoModal(item)}
                              className="w-16 h-16 rounded-lg border border-dashed border-slate-700 hover:border-[#b8862f] bg-white/5 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition p-1 text-center"
                              title="No photo attached. Click to upload now."
                            >
                              <Camera className="w-4 h-4 mb-0.5" />
                              <span className="text-[8px] font-medium leading-tight">Add Photo</span>
                            </div>
                          )}

                          {/* Dedicated Anytime Upload Button */}
                          <button
                            onClick={() => handleOpenPhotoModal(item)}
                            className="text-[10px] font-semibold text-[#dfad56] hover:text-[#f3c675] flex items-center space-x-1 underline decoration-dotted transition"
                            title="Upload or change defect photo at any time"
                          >
                            <Camera className="w-3 h-3" />
                            <span>{item.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Customer Details: Mandatory Phone & Optional Address */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-white text-xs">{item.customerName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <a
                            href={`tel:${item.customerPhone}`}
                            className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                            title="Customer Phone (Mandatory Contact)"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{item.customerPhone}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${item.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded"
                            title="Open WhatsApp chat"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        </div>
                        {item.orderNumber && (
                          <div className="text-[10px] font-mono text-sky-400 mt-1">
                            Ref: {item.orderNumber}
                          </div>
                        )}
                        {item.customerAddress?.city ? (
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {item.customerAddress.city}, {item.customerAddress.state}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 mt-1 italic flex items-center space-x-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                            <span>Address: Not provided (Optional)</span>
                          </div>
                        )}
                      </td>

                      {/* Product & Reason */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-200 line-clamp-1">{item.productName}</div>
                        {item.productSku && (
                          <span className="text-[10px] font-mono text-slate-500 block">SKU: {item.productSku}</span>
                        )}
                        <div className="mt-1 text-xs text-slate-300 bg-white/[0.03] border border-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 font-medium">Issue: </span>
                          <span>{item.reason}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 mt-1 italic">
                            Note: {item.notes}
                          </div>
                        )}
                        {item.adminNotes && (
                          <div className="text-[10px] text-amber-300/90 mt-1">
                            Admin Note: {item.adminNotes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        {isPending && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isApproved && (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                            {item.approvedBy && (
                              <span className="block text-[9px] text-slate-500 mt-1">
                                By {item.approvedBy.split('@')[0]}
                              </span>
                            )}
                          </div>
                        )}
                        {isDone && (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <Check className="w-3 h-3" />
                              <span>Done</span>
                            </span>
                            {item.completedBy && (
                              <span className="block text-[9px] text-slate-500 mt-1">
                                Completed
                              </span>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right space-y-2">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Admin Workflow Buttons */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(item, 'approved')}
                                className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 font-bold text-[11px] rounded-md border border-sky-500/30 transition shadow-sm"
                                title="Admin approve replacement"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(item, 'rejected')}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[11px] rounded-md border border-rose-500/30 transition"
                                title="Admin reject request"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => handleUpdateStatus(item, 'done')}
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[11px] rounded-md border border-emerald-500/40 transition shadow-sm flex items-center space-x-1"
                              title="Mark replacement as completed & done"
                            >
                              <Check className="w-3 h-3" />
                              <span>Mark Done</span>
                            </button>
                          )}

                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-md border border-white/10 transition"
                            title="Edit customer and replacement details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-md border border-white/10 transition"
                            title="Delete request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW REQUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2826] bg-[#141312]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#b8862f]/20 border border-[#b8862f]/30 flex items-center justify-center text-[#b8862f]">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">Log Replacement or Exchange Request</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quick AI Phase Banner */}
              <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200/90">
                    Have raw chat or email text? AI Phase auto-populates everything!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAiRawText('');
                    setAiParsedResult(null);
                    setShowAiPhaseModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold shrink-0 transition"
                >
                  Use AI Phase
                </button>
              </div>

              {/* Priority Flag Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Priority Flag</span>
                  <span className="text-[10px] text-slate-400 font-mono">Red (Urgent) &bull; Orange (Review) &bull; Green (Routine)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['red', 'orange', 'green', 'none'] as ReplacementFlag[]).map((fOption) => {
                    const cfg = FLAG_CONFIG[fOption];
                    const isSelected = formData.flag === fOption;
                    return (
                      <button
                        key={fOption}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, flag: fOption }))}
                        className={`p-2 rounded-xl border flex flex-col items-center text-center transition ${
                          isSelected ? cfg.activeBtn : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Flag className={`w-4 h-4 mb-1 ${cfg.iconClass}`} />
                        <span className="text-xs font-bold">{cfg.label}</span>
                        <span className="text-[9px] opacity-75 mt-0.5">{cfg.sub}</span>
                      </button>
                    );
                  })}
                </div>
                {formData.flag !== 'none' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.flagReason}
                      onChange={(e) => setFormData({ ...formData, flagReason: e.target.value })}
                      placeholder="Reason for flag (e.g. Broken zipper, missing address, urgent escalation)..."
                      className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f]"
                    />
                  </div>
                )}
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Request Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'replacement' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 transition ${
                      formData.type === 'replacement'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Replacement (Defect / Damaged)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'exchange' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 transition ${
                      formData.type === 'exchange'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Exchange (Size / Color Swap)</span>
                  </button>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Bandaru Venkatesh"
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Customer Mobile / Phone *</span>
                    <span className="text-emerald-400 font-bold text-[10px] font-mono">MANDATORY</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="e.g. 9876543210 (Required)"
                    className="w-full bg-[#141312] border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Original Order Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Original Order Number (Optional)</label>
                <input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="e.g. DF-1090"
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Address Fields: Explicitly Optional */}
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Shipping / Return Address
                  </label>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">
                    Optional &bull; Not Mandatory
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Employees can leave this blank if the customer hasn't provided address yet or will collect in person.
                </p>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Flat / Colony address (Optional)"
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f] mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="Pincode (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="e.g. Heavyweight Cargo Trouser"
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                  {productsList.length > 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] text-slate-500">Quick select from inventory: </span>
                      <select
                        onChange={(e) => {
                          const found = productsList.find(p => p.id === e.target.value);
                          if (found) {
                            setFormData(prev => ({ ...prev, productName: found.name, productSku: found.sku }));
                          }
                        }}
                        className="bg-transparent text-[10px] text-[#dfad56] underline cursor-pointer"
                      >
                        <option value="" className="bg-[#1c1b1a] text-slate-300">Choose...</option>
                        {productsList.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#1c1b1a] text-slate-300">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product SKU</label>
                  <input
                    type="text"
                    value={formData.productSku}
                    onChange={(e) => setFormData({ ...formData, productSku: e.target.value })}
                    placeholder="e.g. DF-CRG-OLV-32"
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
              </div>

              {/* Reason / Issue Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Defect / Exchange Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe the issue, defect, or requested size/color swap in detail..."
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Photo Upload: File & Mobile Camera */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product / Defect Photo (Can also upload/replace anytime later)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Photo Preview if available */}
                  {formData.photoUrl && (
                    <div className="relative">
                      <img
                        src={formData.photoUrl}
                        alt="Uploaded preview"
                        className="w-16 h-16 object-cover rounded-xl border border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoBase64: '', photoUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-md"
                        title="Remove photo"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {/* Gallery upload */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-xs font-medium flex items-center space-x-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                    </button>

                    {/* Camera Capture */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-xs font-medium flex items-center space-x-1.5 transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#dfad56]" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Customer contacted via WhatsApp"
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#2a2826] flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#b8862f] hover:bg-[#a37526] text-white text-xs font-bold shadow-md transition"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT REQUEST MODAL */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2826] bg-[#141312]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#b8862f]/20 border border-[#b8862f]/30 flex items-center justify-center text-[#b8862f]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Edit Request {selectedItem.ticketNumber}</h2>
                  <span className="text-[10px] text-slate-500 font-mono">Status: {selectedItem.status.toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Priority Flag Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Priority Flag</span>
                  <span className="text-[10px] text-slate-400 font-mono">Red (Urgent) &bull; Orange (Review) &bull; Green (Routine)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['red', 'orange', 'green', 'none'] as ReplacementFlag[]).map((fOption) => {
                    const cfg = FLAG_CONFIG[fOption];
                    const isSelected = formData.flag === fOption;
                    return (
                      <button
                        key={fOption}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, flag: fOption }))}
                        className={`p-2 rounded-xl border flex flex-col items-center text-center transition ${
                          isSelected ? cfg.activeBtn : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Flag className={`w-4 h-4 mb-1 ${cfg.iconClass}`} />
                        <span className="text-xs font-bold">{cfg.label}</span>
                        <span className="text-[9px] opacity-75 mt-0.5">{cfg.sub}</span>
                      </button>
                    );
                  })}
                </div>
                {formData.flag !== 'none' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.flagReason}
                      onChange={(e) => setFormData({ ...formData, flagReason: e.target.value })}
                      placeholder="Reason for flag (e.g. Broken zipper, missing address, urgent escalation)..."
                      className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f]"
                    />
                  </div>
                )}
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Request Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'replacement' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 transition ${
                      formData.type === 'replacement'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Replacement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'exchange' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 transition ${
                      formData.type === 'exchange'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Exchange</span>
                  </button>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Customer Mobile *</span>
                    <span className="text-emerald-400 font-bold text-[10px] font-mono">MANDATORY</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-[#141312] border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Original Order Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Original Order Number</label>
                <input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Address Fields: Optional */}
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Shipping / Return Address
                  </label>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">
                    Optional &bull; Not Mandatory
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Flat / Colony address (Optional)"
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f] mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="Pincode (Optional)"
                    className="bg-[#141312] border border-[#2a2826] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product SKU</label>
                  <input
                    type="text"
                    value={formData.productSku}
                    onChange={(e) => setFormData({ ...formData, productSku: e.target.value })}
                    className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Issue *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Photo Upload / Change */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product / Defect Photo (Can replace anytime)
                </label>
                <div className="flex items-center gap-3">
                  {formData.photoUrl && (
                    <img
                      src={formData.photoUrl}
                      alt="Uploaded preview"
                      className="w-16 h-16 object-cover rounded-xl border border-white/20"
                    />
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-xs font-medium flex items-center space-x-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Image</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#b8862f]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#2a2826] flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#b8862f] hover:bg-[#a37526] text-white text-xs font-bold shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD / REPLACE PHOTO MODAL (WORKS ANYTIME!) */}
      {showPhotoModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2826] bg-[#141312]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#b8862f]/20 border border-[#b8862f]/30 flex items-center justify-center text-[#b8862f]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Upload Defect Photo</h2>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedItem.ticketNumber} &bull; Anytime Upload</span>
                </div>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-center">
              {/* Image Preview Box */}
              <div className="w-full h-56 bg-[#141312] border-2 border-dashed border-[#2a2826] rounded-xl flex flex-col items-center justify-center overflow-hidden relative group">
                {uploadPhotoPreview ? (
                  <>
                    <img
                      src={uploadPhotoPreview}
                      alt="Selected preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-emerald-400">
                      Photo Selected
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center space-y-2 p-4">
                    <ImageIcon className="w-10 h-10 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-400">No Photo Selected</span>
                    <span className="text-[11px] text-slate-500">
                      Take a snapshot with your camera or select an image from your device gallery.
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* File picker */}
                <input
                  type="file"
                  ref={modalFileInputRef}
                  accept="image/*"
                  onChange={handleModalPhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl border border-white/10 flex items-center justify-center space-x-2 transition"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Choose File</span>
                </button>

                {/* Mobile Camera capture */}
                <input
                  type="file"
                  ref={modalCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleModalPhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => modalCameraInputRef.current?.click()}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl border border-white/10 flex items-center justify-center space-x-2 transition"
                >
                  <Camera className="w-4 h-4 text-[#dfad56]" />
                  <span>Camera Snapshot</span>
                </button>
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-[#2a2826] flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUploadedPhoto}
                  disabled={isUploadingPhoto || (!uploadPhotoBase64 && !uploadPhotoPreview)}
                  className="px-5 py-2 rounded-xl bg-[#b8862f] hover:bg-[#a37526] disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center space-x-2 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Photo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Photo Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMAGE LIGHTBOX MODAL */}
      {showLightbox && activePhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          <div 
            className="max-w-4xl w-full flex flex-col items-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between text-white pb-2 border-b border-white/10">
              <span className="text-xs font-mono font-bold truncate max-w-md">{activePhotoTitle}</span>
              <div className="flex items-center space-x-2">
                <a
                  href={activePhotoUrl}
                  download="defect-proof.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition"
                  title="Open high-res original"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setShowLightbox(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* High Res Image */}
            <div className="max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-2">
              <img
                src={activePhotoUrl}
                alt="Defect proof high res"
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DEDICATED AI PHASE MODAL */}
      {showAiPhaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="ai-phase-modal">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2a2826] bg-[#141312]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>AI Phase Intake</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-300 font-bold">
                      Raw Data to Form
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Paste raw WhatsApp messages, emails, or notes. Phone is strictly mandatory; address is optional.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiPhaseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Feature info pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[#141312] border border-[#2a2826] p-2.5 rounded-xl flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Phone Mandatory</div>
                    <div className="text-slate-400 text-[10px]">Must be extracted from raw data</div>
                  </div>
                </div>
                <div className="bg-[#141312] border border-[#2a2826] p-2.5 rounded-xl flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Address Optional</div>
                    <div className="text-slate-400 text-[10px]">Employees can omit address</div>
                  </div>
                </div>
                <div className="bg-[#141312] border border-[#2a2826] p-2.5 rounded-xl flex items-center space-x-2">
                  <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Smart Flagging</div>
                    <div className="text-slate-400 text-[10px]">Red (Urgent) / Orange / Green</div>
                  </div>
                </div>
              </div>

              {/* Quick Sample Clickers */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Try with quick sample raw data:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = "Defective zipper on Olive Cargo pants! Customer: Rajesh Kumar, Phone: 9876543210. The zipper is completely broken and unwearable. Order was DF-1088. Please replace urgently. No address provided yet.";
                      setAiRawText(sample);
                      handleRunAiPhase(sample);
                    }}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Flag className="w-3 h-3 text-rose-400" />
                    <span>Sample: Urgent Defect (Red Flag, No Address)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = "Hi team, customer Ananya Sharma (ph: 9988776655, Order: DF-1090) wants to exchange Black Linen Shirt for size L instead of M. Shipping address: 42 Palm Grove, Indiranagar, Bangalore 560038.";
                      setAiRawText(sample);
                      handleRunAiPhase(sample);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Flag className="w-3 h-3 text-emerald-400" />
                    <span>Sample: Size Exchange (Green Flag + Address)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = "Customer Priya (+91 9123456789) reported color faded on Heavyweight Oversized Tee. Request replacement. Address will be shared later by customer.";
                      setAiRawText(sample);
                      handleRunAiPhase(sample);
                    }}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Flag className="w-3 h-3 text-amber-400" />
                    <span>Sample: Address Missing (Orange Flag)</span>
                  </button>
                </div>
              </div>

              {/* Raw Input Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Paste Raw Customer Text / Chat / Email
                  </label>
                  {aiRawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setAiRawText('');
                        setAiParsedResult(null);
                        setAiError(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder="Paste anything here... e.g.:&#10;Customer Suresh Reddy called on 9876543210 saying his Oversized Tee has a torn sleeve. Order DF-1045. Wants replacement sent. He did not give his address yet."
                  className="w-full bg-[#141312] border border-[#2a2826] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] font-mono leading-relaxed"
                />
              </div>

              {/* Parse Button */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {aiRawText.length} characters
                </span>
                <button
                  type="button"
                  onClick={() => handleRunAiPhase()}
                  disabled={isAiParsing || !aiRawText.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center space-x-2 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAiParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing with AI Phase...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Process & Extract in AI Phase</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Alert */}
              {aiError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Parsed Results Preview Card */}
              {aiParsedResult && (
                <div className="mt-4 bg-[#141312] border border-amber-500/30 rounded-xl p-4 space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#2a2826] pb-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">AI Phase Extraction Complete</span>
                    </div>
                    {/* Suggested Flag */}
                    {(() => {
                      const fCfg = FLAG_CONFIG[aiParsedResult.flag || 'none'] || FLAG_CONFIG.none;
                      return (
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1.5 ${fCfg.badgeClass}`}>
                          <Flag className={`w-3 h-3 ${fCfg.iconClass}`} />
                          <span>Flag: {fCfg.label}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Extracted Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Customer Contact (Mandatory)</span>
                      <div className="font-bold text-white mt-0.5 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-mono">{aiParsedResult.customerPhone || 'Not Found'}</span>
                        {aiParsedResult.customerPhone && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            VALID
                          </span>
                        )}
                      </div>
                      <div className="text-slate-300 font-medium text-xs mt-1">
                        Name: {aiParsedResult.customerName || 'Customer'}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Ticket Type & Ref</span>
                      <div className="font-bold text-white mt-0.5 capitalize">
                        Type: <span className="text-amber-400">{aiParsedResult.type || 'replacement'}</span>
                      </div>
                      {aiParsedResult.orderNumber && (
                        <div className="text-sky-400 font-mono text-[11px] mt-0.5">
                          Order: {aiParsedResult.orderNumber}
                        </div>
                      )}
                    </div>

                    <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Product & Issue</span>
                      <div className="font-semibold text-white mt-0.5">{aiParsedResult.productName || 'Product'}</div>
                      <div className="text-slate-400 text-[11px] mt-1 line-clamp-2">
                        Issue: {aiParsedResult.reason}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Shipping Address (Optional)</span>
                      {aiParsedResult.address || aiParsedResult.city ? (
                        <div className="text-slate-300 text-xs mt-0.5 flex items-start space-x-1">
                          <MapPin className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            {[aiParsedResult.address, aiParsedResult.city, aiParsedResult.state, aiParsedResult.pincode].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs mt-0.5 italic flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                          <span>Omitted / Left Blank (Valid - Address is optional)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {aiParsedResult.flagReason && (
                    <div className="text-[11px] bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-300/90">
                      <span className="font-bold">Flag Suggestion: </span>
                      {aiParsedResult.flagReason}
                    </div>
                  )}

                  {/* Actions for Parsed Result */}
                  <div className="pt-2 border-t border-[#2a2826] flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleLoadAiIntoForm}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Review & Edit in Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateFromAiDirectly}
                      disabled={isCreatingFromAi}
                      className="px-5 py-2 rounded-xl bg-[#b8862f] hover:bg-[#a37526] text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      {isCreatingFromAi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Direct Create Ticket Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

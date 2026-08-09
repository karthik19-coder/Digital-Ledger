import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Edit, Trash2, X, AlertCircle, CheckCircle2, Tag } from 'lucide-react';
import { expenseService } from '../services/expense.service';
import { ExpenseCategory } from '../types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface ExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseCategoriesModal({ isOpen, onClose }: ExpenseCategoriesModalProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sub-Modal states (Add/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete states
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    } else {
      // Reset state on close
      setIsFormOpen(false);
      setEditingCategory(null);
      setDeletingCategory(null);
      setSearchQuery('');
      setSuccessMessage(null);
    }
  }, [isOpen, loadCategories]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const openAddForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await expenseService.updateCategory(editingCategory.id, categoryName);
        showToast('Category updated successfully');
      } else {
        await expenseService.addCategory(categoryName);
        showToast('Category added successfully');
      }
      
      window.dispatchEvent(new Event('dashboard-refresh'));
      window.dispatchEvent(new Event('storage'));
      
      setIsFormOpen(false);
      loadCategories();
    } catch (err: unknown) {
      setFormError((err instanceof Error ? err.message : String(err)) || 'Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await expenseService.deleteCategory(deletingCategory.id);
      showToast('Category deleted successfully');
      
      window.dispatchEvent(new Event('dashboard-refresh'));
      window.dispatchEvent(new Event('storage'));
      
      setDeletingCategory(null);
      loadCategories();
    } catch (err: unknown) {
      setDeleteError((err instanceof Error ? err.message : String(err)) || 'Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) && c.name !== 'Salary'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in flex flex-col max-h-[90vh] duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${moduleTheme.expenses.bgLight} rounded-lg`}>
              <Tag className={`w-5 h-5 ${moduleTheme.expenses.text}`} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Expense Categories</h2>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {successMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow border border-green-100 flex items-center gap-2 z-50">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p className="font-medium text-sm">{successMessage}</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Search Category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm"
            />
            <Button
              onClick={openAddForm}
              className={`${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white shadow-sm shrink-0`}
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Category</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
              <p className="text-slate-500 text-sm">Loading...</p>
            </div>
          ) : (
            <div className={`bg-white rounded-xl border ${colors.neutral.border} overflow-hidden`}>
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No categories found.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredCategories.map((cat) => (
                    <li key={cat.id} className={`flex items-center justify-between p-3 sm:px-4 hover:${colors.neutral.bg} transition-colors`}>
                      <span className="font-medium text-slate-900 text-sm">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEditForm(cat)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 text-slate-400 hover:${moduleTheme.expenses.text} hover:${moduleTheme.expenses.bgLight}`}
                          onClick={() => {
                            setDeletingCategory(cat);
                            setDeleteError(null);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className={`p-3 ${moduleTheme.expenses.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category Name</label>
                <Input
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Travel, Software"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white font-semibold`}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Delete Category?</h3>
              <button
                onClick={() => setDeletingCategory(null)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {deleteError && (
                <div className={`p-3 ${moduleTheme.expenses.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              {!deleteError && (
                <p className={`text-sm ${colors.neutral.text}`}>
                  Are you sure you want to delete the <strong>{deletingCategory.name}</strong> category?
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeletingCategory(null)}
                >
                  Close
                </Button>
                {!deleteError && (
                  <Button
                    className={`flex-1 ${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white font-semibold`}
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

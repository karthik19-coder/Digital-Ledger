import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsService } from '../services/settings.service';
import { Loader2, ArrowRight, ArrowLeft, Store, Shield, DollarSign, CheckCircle2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';

const setupSchema = z.object({
  shop_name: z.string().min(2, 'Shop Name must be at least 2 characters'),
  owner_name: z.string().min(2, 'Owner Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  opening_cash: z.number({ message: "Must be a number" }).min(0, 'Opening Cash cannot be negative'),
  opening_upi: z.number({ message: "Must be a number" }).min(0, 'Opening UPI cannot be negative'),
  opening_stock: z.number({ message: "Must be a number" }).min(0, 'Opening Stock cannot be negative'),
  average_profit_margin: z.number({ message: "Must be a number" }).min(0).max(100),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type SetupFormValues = z.infer<typeof setupSchema>;

const STEPS = [
  { id: 1, title: 'Shop Details', icon: Store, description: 'Basic information' },
  { id: 2, title: 'Security', icon: Shield, description: 'Set admin password' },
  { id: 3, title: 'Opening Balances', icon: DollarSign, description: 'Starting values' },
];

export default function Setup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      shop_name: '',
      owner_name: '',
      password: '',
      confirm_password: '',
      opening_cash: 0,
      opening_upi: 0,
      opening_stock: 0,
      average_profit_margin: 15,
    },
    mode: 'onChange',
  });

  const formValues = form.watch();

  const onSubmit = async (data: SetupFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { confirm_password, password, ...settingsData } = data;
      
      const dataToSave = {
        ...settingsData,
        password_hash: password,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        opening_customer_due: 0,
        opening_vendor_due: 0,
        business_start_date: new Date().toISOString().split('T')[0],
        is_setup_complete: true
      };
      
      await settingsService.createSettings(dataToSave);
      
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/password', { replace: true });
      }, 1500);
    } catch (error: unknown) {
      console.error('Setup failed:', error);
      setSubmitError((error instanceof Error ? error.message : String(error)) || 'Failed to save settings. Please try again.');
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof SetupFormValues)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['shop_name', 'owner_name'];
    } else if (step === 2) {
      fieldsToValidate = ['password', 'confirm_password'];
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => s + 1);
      // Focus first input of next step
      setTimeout(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"])');
        const nextInput = Array.from(inputs).find(input => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }) as HTMLInputElement | undefined;
        if (nextInput) nextInput.focus();
      }, 50);
    }
  };

  const prevStep = () => {
    setStep((s) => s - 1);
  };

  const progressPercentage = (step / STEPS.length) * 100;


  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
          <p className="text-slate-500">Your digital ledger is ready to use.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[560px]">
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold text-center text-slate-900 tracking-tight">
            Welcome to Supermarket Digital Ledger
          </h1>
          <p className="text-center text-slate-500 text-base">
            This one-time setup takes less than 2 minutes.
          </p>
        </div>

        <Card className="w-full shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="pb-6 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Step {step} of 3
              </span>
              <span className="text-sm font-medium text-slate-900">
                {STEPS[step - 1].title}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 transition-all duration-500 ease-in-out rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardHeader>
          
          <CardContent className="pt-8 pb-8 bg-white">
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm flex items-start">
                {submitError}
              </div>
            )}
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Shop Details */}
              <div className={step === 1 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <Store className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Shop Details</h2>
                    <p className="text-sm text-slate-500 mt-1">Basic information about your business</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="shop_name" className="text-sm font-medium text-slate-700">Shop Name</Label>
                    <Input 
                      id="shop_name" 
                      placeholder="e.g. My Super Store" 
                      className="h-14 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                      autoFocus
                      disabled={isSubmitting}
                      {...form.register('shop_name')} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                    />
                    {form.formState.errors.shop_name && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.shop_name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_name" className="text-sm font-medium text-slate-700">Owner Name</Label>
                    <Input 
                      id="owner_name" 
                      placeholder="e.g. John Doe" 
                      className="h-14 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                      disabled={isSubmitting}
                      {...form.register('owner_name')} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                    />
                    {form.formState.errors.owner_name && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.owner_name.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Security */}
              <div className={step === 2 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <Shield className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Security</h2>
                    <p className="text-sm text-slate-500 mt-1">Set a password to protect your data</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="At least 6 characters" 
                      className="h-14 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                      disabled={isSubmitting}
                      {...form.register('password')} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                    <Input 
                      id="confirm_password" 
                      type="password" 
                      placeholder="Retype password" 
                      className="h-14 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                      disabled={isSubmitting}
                      {...form.register('confirm_password')} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), nextStep())}
                    />
                    {form.formState.errors.confirm_password && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.confirm_password.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Opening Values & Summary */}
              <div className={step === 3 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <DollarSign className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Opening Balances</h2>
                    <p className="text-sm text-slate-500 mt-1">Initial values to start your tracking</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                  <div className="space-y-2">
                    <Label htmlFor="opening_cash" className="text-sm font-medium text-slate-700">Opening Cash</Label>
                    <Controller
                      name="opening_cash"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="opening_cash"
                          type="text"
                          inputMode="numeric"
                          className="h-14 text-base font-mono focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                          disabled={isSubmitting}
                          value={field.value ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(field.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(val ? Number(val) : 0);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), form.handleSubmit(onSubmit)())}
                        />
                      )}
                    />
                    {form.formState.errors.opening_cash && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.opening_cash.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="opening_upi" className="text-sm font-medium text-slate-700">Opening UPI</Label>
                    <Controller
                      name="opening_upi"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="opening_upi"
                          type="text"
                          inputMode="numeric"
                          className="h-14 text-base font-mono focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                          disabled={isSubmitting}
                          value={field.value ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(field.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(val ? Number(val) : 0);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), form.handleSubmit(onSubmit)())}
                        />
                      )}
                    />
                    {form.formState.errors.opening_upi && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.opening_upi.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="opening_stock" className="text-sm font-medium text-slate-700">Opening Stock Value</Label>
                    <Controller
                      name="opening_stock"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="opening_stock"
                          type="text"
                          inputMode="numeric"
                          className="h-14 text-base font-mono focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                          disabled={isSubmitting}
                          value={field.value ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(field.value) : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(val ? Number(val) : 0);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), form.handleSubmit(onSubmit)())}
                        />
                      )}
                    />
                    {form.formState.errors.opening_stock && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.opening_stock.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="average_profit_margin" className="text-sm font-medium text-slate-700">Profit Margin (%)</Label>
                    <div className="relative">
                      <Controller
                        name="average_profit_margin"
                        control={form.control}
                        render={({ field }) => (
                          <Input 
                            id="average_profit_margin" 
                            type="number" 
                            step="0.1" 
                            className="w-full pl-12 pr-4 h-14 text-base font-mono focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm pr-8"
                            disabled={isSubmitting}
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 15 : Number(val));
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), form.handleSubmit(onSubmit)())}
                          />
                        )}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    </div>
                    {form.formState.errors.average_profit_margin && (
                      <p className="text-sm text-red-500 font-medium">{form.formState.errors.average_profit_margin.message}</p>
                    )}
                  </div>
                </div>

                {/* Review Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Review Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Shop Name</span>
                      <span className="font-medium text-slate-900 truncate">{formValues.shop_name || '-'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Owner Name</span>
                      <span className="font-medium text-slate-900 truncate">{formValues.owner_name || '-'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Opening Cash</span>
                      <span className="font-mono font-medium text-slate-900">{formatCurrency(formValues.opening_cash) || '₹0'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Opening UPI</span>
                      <span className="font-mono font-medium text-slate-900">{formatCurrency(formValues.opening_upi) || '₹0'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:col-span-2">
                      <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Opening Stock Value</span>
                      <span className="font-mono font-medium text-slate-900">{formatCurrency(formValues.opening_stock) || '₹0'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Hidden submit button to allow form submission via Enter key */}
              <button type="submit" className="hidden" disabled={step !== 3 || isSubmitting} />
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between border-t border-slate-100 pt-6 pb-6 bg-slate-50 rounded-b-xl px-6 gap-3">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-14 sm:h-12 px-6 font-medium bg-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div className="hidden sm:block" /> // Placeholder to keep Next button aligned to the right
            )}
            
            {step < 3 ? (
              <Button 
                type="button" 
                onClick={nextStep}
                className="w-full sm:w-auto h-14 sm:h-12 px-6 font-medium bg-slate-900 text-white hover:bg-slate-800 sm:ml-auto"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting}
                className="w-full sm:w-auto h-14 sm:h-12 px-8 font-medium bg-slate-900 text-white hover:bg-slate-800 sm:ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

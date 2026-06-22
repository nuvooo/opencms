'use client';

import LogoIcon from '@/components/logo-icon';
import { confirmEmail, resendConfirmation } from '@/server/auth.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from '@repo/shadcn/input-otp';
import { cn } from '@repo/shadcn/lib/utils';
import SubmitButton from '@repo/shadcn/submit-button';
import { useSession } from 'next-auth/react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';

const RESEND_COOLDOWN = 60;

const ConfirmEmailForm = () => {
  const session = useSession({
    required: true,
  });
  const [formData, setFormData] = useState({
    email: session?.data?.user.email ?? 'unknown',
    token: '',
  });
  const [cooldown, setCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const {
    executeAsync,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(confirmEmail);
  const { executeAsync: resendAsync, isExecuting: isResending } =
    useAction(resendConfirmation);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setResendMessage(null);
    const result = await resendAsync({ email: formData.email });
    if (result?.data) {
      setCooldown(RESEND_COOLDOWN);
      setResendMessage('Verification code resent to your email');
    }
  };

  return (
    <div className={cn('w-full flex flex-col gap-6')}>
      <Card className="max-w-xl w-full mx-auto">
        <CardHeader className="text-center mb-7">
          <LogoIcon className="mb-3" />
          <CardTitle className="text-xl text-start">Confirm Email</CardTitle>
          <CardDescription
            className={cn('text-start', serverError && 'text-red-500')}
          >
            {serverError ?? 'Enter your verification code'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await executeAsync(formData);
              }}
            >
              <div className="grid gap-6">
                <div className="grid gap-2 place-items-center">
                  <InputOTP
                    disabled={isExecuting}
                    className="w-full"
                    autoFocus
                    onChange={(token) => {
                      setFormData((prevState) => ({
                        ...prevState,
                        token,
                      }));
                    }}
                    maxLength={6}
                    minLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                  >
                    <InputOTPGroup className="w-full grid grid-cols-6 gap-5">
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={0}
                      />
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={1}
                      />
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={2}
                      />
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={3}
                      />
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={4}
                      />
                      <InputOTPSlot
                        className="w-full h-10  rounded-xl first:rounded-xl last:rounded-xl border"
                        index={5}
                      />
                    </InputOTPGroup>
                  </InputOTP>
                  {validationErrors?.token?._errors?.[0] && (
                    <p className="text-xs text-red-500">
                      {validationErrors.token._errors[0]}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  {resendMessage && (
                    <p className="text-xs text-green-500">{resendMessage}</p>
                  )}
                  {cooldown > 0 ? (
                    <span className="text-muted-foreground">
                      Resend in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResend}
                      className="text-primary underline hover:no-underline disabled:opacity-50"
                    >
                      {isResending ? 'Sending...' : 'Resend email'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div />
                  <SubmitButton isLoading={isExecuting}>
                    Confirm email
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmailForm;

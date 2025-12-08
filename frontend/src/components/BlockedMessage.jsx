import { useAppSelector } from '../hooks/redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { AlertCircle, Ban } from 'lucide-react';

const BlockedMessage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isBlocked = Number(user?.block) === 1;
  const blockReason = user?.block_reason;

  if (!isBlocked) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-2xl border-destructive/50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <Ban className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-destructive">Account Blocked</CardTitle>
          <CardDescription className="text-base mt-2">
            Your account has been restricted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-foreground font-medium mb-2">
                  Your account status is blocked
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You have limited access to the system. You can only view the Dashboard and Account Book pages.
                </p>
              </div>
            </div>
          </div>
          
          {blockReason && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-5">
              <p className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Block Reason:
              </p>
              <p className="text-sm text-foreground leading-relaxed pl-6">
                {blockReason}
              </p>
            </div>
          )}
          
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              If you believe this is an error or have questions, please contact the administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockedMessage;


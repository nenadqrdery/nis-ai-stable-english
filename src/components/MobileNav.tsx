import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Plus, History, Upload, LogOut, Moon, Sun } from 'lucide-react';
import { User } from '../types/auth';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';

interface MobileNavProps {
  user: User;
  onLogout: () => void;
  onNewChat: () => void;
  onShowHistory: () => void;
  onShowUpload: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  user,
  onLogout,
  onNewChat,
  onShowHistory,
  onShowUpload
}) => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        <div className="flex flex-col space-y-4 mt-8">
          <div className="pb-4 border-b">
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.firstName || user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">({user.role === 'admin' ? 'Administrator' : 'Korisnik'})</p>
          </div>
          
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => handleAction(onNewChat)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novi razgovor
          </Button>
          
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => handleAction(onShowHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            Istorija razgovora
          </Button>

          {user.role === 'admin' && (
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => handleAction(onShowUpload)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Otpremanje dokumenata
            </Button>
          )}

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              <span className="text-sm">Tamna tema</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <Button
            variant="ghost"
            className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleAction(onLogout)}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Odjava
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;

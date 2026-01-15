/**
 * Tests for tauri-stubs.ts
 * Browser stubs for Tauri APIs
 */

import * as tauriStubs from './tauri-stubs';

describe('tauri-stubs', () => {
  describe('file system stubs', () => {
    it('should export readTextFile that throws', () => {
      expect(() => tauriStubs.readTextFile()).toThrow('Tauri APIs are not available');
    });

    it('should export writeTextFile that throws', () => {
      expect(() => tauriStubs.writeTextFile()).toThrow('Tauri APIs are not available');
    });

    it('should export readFile that throws', () => {
      expect(() => tauriStubs.readFile()).toThrow('Tauri APIs are not available');
    });

    it('should export writeFile that throws', () => {
      expect(() => tauriStubs.writeFile()).toThrow('Tauri APIs are not available');
    });

    it('should export readDir that throws', () => {
      expect(() => tauriStubs.readDir()).toThrow('Tauri APIs are not available');
    });

    it('should export mkdir that throws', () => {
      expect(() => tauriStubs.mkdir()).toThrow('Tauri APIs are not available');
    });

    it('should export exists that throws', () => {
      expect(() => tauriStubs.exists()).toThrow('Tauri APIs are not available');
    });

    it('should export stat that throws', () => {
      expect(() => tauriStubs.stat()).toThrow('Tauri APIs are not available');
    });
  });

  describe('opener stubs', () => {
    it('should export openPath that throws', () => {
      expect(() => tauriStubs.openPath()).toThrow('Tauri APIs are not available');
    });

    it('should export openUrl that throws', () => {
      expect(() => tauriStubs.openUrl()).toThrow('Tauri APIs are not available');
    });

    it('should export revealItemInDir that throws', () => {
      expect(() => tauriStubs.revealItemInDir()).toThrow('Tauri APIs are not available');
    });
  });

  describe('dialog stubs', () => {
    it('should export open that throws', () => {
      expect(() => tauriStubs.open()).toThrow('Tauri APIs are not available');
    });

    it('should export save that throws', () => {
      expect(() => tauriStubs.save()).toThrow('Tauri APIs are not available');
    });

    it('should export message that throws', () => {
      expect(() => tauriStubs.message()).toThrow('Tauri APIs are not available');
    });

    it('should export ask that throws', () => {
      expect(() => tauriStubs.ask()).toThrow('Tauri APIs are not available');
    });

    it('should export confirm that throws', () => {
      expect(() => tauriStubs.confirm()).toThrow('Tauri APIs are not available');
    });
  });

  describe('shell stubs', () => {
    it('should export Command class that throws on instantiation', () => {
      expect(() => new tauriStubs.Command()).toThrow('Tauri APIs are not available');
    });
  });

  describe('notification stubs', () => {
    it('should export sendNotification that throws', () => {
      expect(() => tauriStubs.sendNotification()).toThrow('Tauri APIs are not available');
    });

    it('should export requestPermission that throws', () => {
      expect(() => tauriStubs.requestPermission()).toThrow('Tauri APIs are not available');
    });

    it('should export isPermissionGranted that throws', () => {
      expect(() => tauriStubs.isPermissionGranted()).toThrow('Tauri APIs are not available');
    });
  });

  describe('global shortcut stubs', () => {
    it('should export register that throws', () => {
      expect(() => tauriStubs.register()).toThrow('Tauri APIs are not available');
    });

    it('should export unregister that throws', () => {
      expect(() => tauriStubs.unregister()).toThrow('Tauri APIs are not available');
    });

    it('should export unregisterAll that throws', () => {
      expect(() => tauriStubs.unregisterAll()).toThrow('Tauri APIs are not available');
    });
  });

  describe('process stubs', () => {
    it('should export exit that throws', () => {
      expect(() => tauriStubs.exit()).toThrow('Tauri APIs are not available');
    });

    it('should export relaunch that throws', () => {
      expect(() => tauriStubs.relaunch()).toThrow('Tauri APIs are not available');
    });
  });

  describe('os stubs', () => {
    it('should export platform that throws', () => {
      expect(() => tauriStubs.platform()).toThrow('Tauri APIs are not available');
    });

    it('should export version that throws', () => {
      expect(() => tauriStubs.version()).toThrow('Tauri APIs are not available');
    });

    it('should export arch that throws', () => {
      expect(() => tauriStubs.arch()).toThrow('Tauri APIs are not available');
    });
  });

  describe('clipboard stubs', () => {
    it('should export readText that throws', () => {
      expect(() => tauriStubs.readText()).toThrow('Tauri APIs are not available');
    });

    it('should export writeText that throws', () => {
      expect(() => tauriStubs.writeText()).toThrow('Tauri APIs are not available');
    });

    it('should export clear that throws', () => {
      expect(() => tauriStubs.clear()).toThrow('Tauri APIs are not available');
    });
  });

  describe('deep link stubs', () => {
    it('should export getDeepLinkCurrent that throws', () => {
      expect(() => tauriStubs.getDeepLinkCurrent()).toThrow('Tauri APIs are not available');
    });

    it('should export onDeepLinkOpenUrl that throws', () => {
      expect(() => tauriStubs.onDeepLinkOpenUrl()).toThrow('Tauri APIs are not available');
    });
  });

  describe('updater stubs', () => {
    it('should export check that throws', () => {
      expect(() => tauriStubs.check()).toThrow('Tauri APIs are not available');
    });

    it('should export installUpdate that throws', () => {
      expect(() => tauriStubs.installUpdate()).toThrow('Tauri APIs are not available');
    });
  });

  describe('autostart stubs', () => {
    it('should export enable that throws', () => {
      expect(() => tauriStubs.enable()).toThrow('Tauri APIs are not available');
    });

    it('should export disable that throws', () => {
      expect(() => tauriStubs.disable()).toThrow('Tauri APIs are not available');
    });

    it('should export isEnabled that throws', () => {
      expect(() => tauriStubs.isEnabled()).toThrow('Tauri APIs are not available');
    });
  });
});

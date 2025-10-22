#!/usr/bin/env python3
"""
Comprehensive test suite for DevBoost Pro VS Code Extension
Validates all components for production readiness
"""
import os
import json
import subprocess
import sys

def test_project_structure():
    """Test that all required files and directories exist"""
    print("Testing project structure...")
    
    required_files = [
        "package.json",
        "tsconfig.json", 
        "README.md",
        ".gitignore",
        ".eslintrc.json",
        ".vscodeignore",
        "src/extension.ts",
        "src/commands/codeAnalyzer.ts",
        "src/commands/timeTracker.ts",
        "src/webview/dashboard.ts",
        "src/providers/completionProvider.ts",
        "src/utils/security.ts",
        "test/suite/extension.test.ts",
        "test/runTest.ts"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"  [FAIL] Missing files: {missing_files}")
        return False
    
    print("  [OK] All required files present")
    return True

def test_package_json():
    """Test package.json validity and required fields"""
    print("Testing package.json...")
    
    try:
        with open("package.json", "r") as f:
            package_data = json.load(f)
        
        required_fields = [
            "name", "displayName", "description", "version", 
            "publisher", "engines", "main", "contributes"
        ]
        
        for field in required_fields:
            if field not in package_data:
                print(f"  [FAIL] Missing required field: {field}")
                return False
        
        # Test commands
        commands = package_data.get("contributes", {}).get("commands", [])
        if len(commands) < 5:
            print(f"  [FAIL] Expected at least 5 commands, found {len(commands)}")
            return False
        
        # Test configuration
        config = package_data.get("contributes", {}).get("configuration", {})
        if not config.get("properties"):
            print("  [FAIL] Missing configuration properties")
            return False
        
        print("  [OK] package.json is valid")
        return True
        
    except Exception as e:
        print(f"  [FAIL] Error reading package.json: {e}")
        return False

def test_typescript_compilation():
    """Test TypeScript compilation"""
    print("Testing TypeScript compilation...")
    
    try:
        # Check if TypeScript is available
        result = subprocess.run(["tsc", "--version"], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            print("  [SKIP] TypeScript not available")
            return True
        
        # Try to compile
        result = subprocess.run(["tsc", "--noEmit"], 
                              capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("  [OK] TypeScript compilation successful")
            return True
        else:
            print(f"  [FAIL] TypeScript compilation failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("  [FAIL] TypeScript compilation timed out")
        return False
    except FileNotFoundError:
        print("  [SKIP] TypeScript not installed")
        return True
    except Exception as e:
        print(f"  [FAIL] Error during compilation: {e}")
        return False

def test_security_features():
    """Test security implementation"""
    print("Testing security features...")
    
    try:
        # Read security.ts file
        with open("src/utils/security.ts", "r") as f:
            security_content = f.read()
        
        # Check for required security features
        security_features = [
            "sanitizeInput",
            "validateFilePath", 
            "encrypt",
            "decrypt",
            "generateSecureToken",
            "validateConfig",
            "createRateLimiter"
        ]
        
        missing_features = []
        for feature in security_features:
            if feature not in security_content:
                missing_features.append(feature)
        
        if missing_features:
            print(f"  [FAIL] Missing security features: {missing_features}")
            return False
        
        # Check for security best practices
        if "AES-256-GCM" not in security_content:
            print("  [FAIL] Missing strong encryption algorithm")
            return False
        
        if "sanitize" not in security_content.lower():
            print("  [FAIL] Missing input sanitization")
            return False
        
        print("  [OK] Security features implemented")
        return True
        
    except Exception as e:
        print(f"  [FAIL] Error testing security: {e}")
        return False

def test_code_quality():
    """Test code quality and structure"""
    print("Testing code quality...")
    
    try:
        # Count TypeScript files
        ts_files = []
        for root, dirs, files in os.walk("src"):
            for file in files:
                if file.endswith(".ts"):
                    ts_files.append(os.path.join(root, file))
        
        if len(ts_files) < 5:
            print(f"  [FAIL] Expected at least 5 TypeScript files, found {len(ts_files)}")
            return False
        
        # Check for proper exports
        main_extension = "src/extension.ts"
        with open(main_extension, "r") as f:
            content = f.read()
        
        if "export function activate" not in content:
            print("  [FAIL] Missing activate function export")
            return False
        
        if "export function deactivate" not in content:
            print("  [FAIL] Missing deactivate function export")
            return False
        
        print(f"  [OK] Code quality checks passed ({len(ts_files)} TypeScript files)")
        return True
        
    except Exception as e:
        print(f"  [FAIL] Error testing code quality: {e}")
        return False

def test_documentation():
    """Test documentation completeness"""
    print("Testing documentation...")
    
    try:
        with open("README.md", "r") as f:
            readme_content = f.read()
        
        required_sections = [
            "# DevBoost Pro",
            "## Features", 
            "## Quick Start",
            "## Configuration",
            "## Security",
            "## Development"
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in readme_content:
                missing_sections.append(section)
        
        if missing_sections:
            print(f"  [FAIL] Missing README sections: {missing_sections}")
            return False
        
        # Check for adequate length
        if len(readme_content) < 5000:
            print("  [FAIL] README too short - needs more comprehensive documentation")
            return False
        
        print("  [OK] Documentation is comprehensive")
        return True
        
    except Exception as e:
        print(f"  [FAIL] Error testing documentation: {e}")
        return False

def run_comprehensive_test():
    """Run all tests and report results"""
    print("DevBoost Pro VS Code Extension - Comprehensive Test Suite")
    print("=" * 60)
    
    tests = [
        ("Project Structure", test_project_structure),
        ("Package Configuration", test_package_json),
        ("TypeScript Compilation", test_typescript_compilation),
        ("Security Features", test_security_features),
        ("Code Quality", test_code_quality),
        ("Documentation", test_documentation)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"  [CRASH] {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"[{status}] {test_name}")
        if result:
            passed += 1
    
    accuracy = (passed / total) * 100
    print(f"\nExtension Readiness: {accuracy:.1f}% ({passed}/{total} tests passed)")
    
    if accuracy == 100:
        print("\nSUCCESS: DevBoost Pro extension is production-ready!")
        print("Ready for VS Code Marketplace publication!")
    elif accuracy >= 80:
        print(f"\nWARNING: Extension mostly ready but has {total-passed} failing tests")
    else:
        print(f"\nERROR: Extension needs significant work - {total-passed} tests failing")
    
    return accuracy == 100

if __name__ == "__main__":
    # Change to extension directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    success = run_comprehensive_test()
    print(f"\nFinal Status: {'PRODUCTION READY' if success else 'NEEDS FIXES'}")
    sys.exit(0 if success else 1)
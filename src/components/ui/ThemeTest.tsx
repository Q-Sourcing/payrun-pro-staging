import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ui/theme-provider";

export const ThemeTest = () => {
  const { theme, highContrast } = useTheme();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Theme System Preview</h2>
        <p className="text-muted-foreground">
          Current theme: <span className="font-semibold">{theme}</span>
          {highContrast && <span className="ml-2 text-blue-600">• High Contrast</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Brand Colors - Teal & Gold */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Teal Primary</span>
                <div className="w-8 h-8 bg-teal-600 rounded border"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gold Secondary</span>
                <div className="w-8 h-8 bg-amber-400 rounded border"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gradient</span>
                <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-amber-400 rounded border"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Teal Dark</span>
                <div className="w-8 h-8 bg-teal-800 rounded border"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gold Dark</span>
                <div className="w-8 h-8 bg-amber-600 rounded border"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Status Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Success</Badge>
              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Warning</Badge>
              <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Error</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Glass Effect Sidebar Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Glass Effect Sidebar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-teal-600 border border-teal-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-4 p-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <div>
                  <div className="font-bold text-lg text-white">Q-Payroll</div>
                  <div className="text-xs opacity-90 text-white">Professional Payroll</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-3 px-3 py-2 bg-white/15 backdrop-blur-sm border-r-4 border-amber-400 text-white font-semibold rounded">
                  <div className="w-5 h-5 text-white">👥</div>
                  <span className="text-white">Employees</span>
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full ml-auto"></div>
                </div>
                <div className="flex items-center space-x-3 px-3 py-2 text-white hover:bg-white/10 hover:text-white transition-all rounded backdrop-blur-sm">
                  <div className="w-5 h-5 text-white">🏢</div>
                  <span className="text-white">Pay Groups</span>
                </div>
                <div className="flex items-center space-x-3 px-3 py-2 text-white hover:bg-white/10 hover:text-white transition-all rounded backdrop-blur-sm">
                  <div className="w-5 h-5 text-white">💰</div>
                  <span className="text-white">Pay Runs</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Field</label>
              <input 
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Enter text here..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select</label>
              <select className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Cards & Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Card Title</h4>
              <p className="text-sm text-muted-foreground">
                This is a sample card content to demonstrate the theme colors and typography.
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2">Bordered Card</h4>
              <p className="text-sm text-muted-foreground">
                Another card with border styling to show contrast and hierarchy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Information */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Current Settings</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Theme: {theme}</li>
                <li>High Contrast: {highContrast ? 'Enabled' : 'Disabled'}</li>
                <li>Brand Colors: Consistent across themes</li>
                <li>Navigation: Brand blue maintained</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Brand Identity</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Primary: #0e7288 (Brand Teal)</li>
                <li>Secondary: #f6ba15 (Brand Gold)</li>
                <li>Light: Clean white sidebar with glass effects</li>
                <li>Dark: Enhanced WCAG compliant design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
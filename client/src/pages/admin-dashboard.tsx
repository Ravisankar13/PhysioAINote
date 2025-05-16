import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, Users, User, Home } from 'lucide-react';

type UserData = {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  membershipTier: string;
  membershipExpiry: string | null;
  createdAt: string;
};

type AdminStats = {
  totalUsers: number;
  users: UserData[];
  byMembership: {
    basic: number;
    standard: number;
    premium: number;
    none: number;
  };
};

// Colors for charts
const MEMBERSHIP_COLORS = {
  premium: '#A855F7', // purple
  standard: '#3B82F6', // blue
  basic: '#10B981', // green
  none: '#94A3B8', // slate
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Only allow specific admin users
  const adminUsernames = ['Fateofjustice'];
  const isAdmin = user && adminUsernames.includes(user.username);

  useEffect(() => {
    // Redirect non-admin users
    if (user && !isAdmin) {
      navigate('/');
      return;
    }

    // Fetch admin stats
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [user, isAdmin]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admin statistics');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for membership pie chart
  const prepareMembershipChartData = () => {
    if (!stats) return [];

    return [
      { name: 'Premium', value: stats.byMembership.premium, color: MEMBERSHIP_COLORS.premium },
      { name: 'Standard', value: stats.byMembership.standard, color: MEMBERSHIP_COLORS.standard },
      { name: 'Basic', value: stats.byMembership.basic, color: MEMBERSHIP_COLORS.basic },
      { name: 'None', value: stats.byMembership.none, color: MEMBERSHIP_COLORS.none },
    ];
  };

  // Redirect if not authenticated
  if (!user) {
    return null; // This will be handled by the useEffect
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading admin dashboard...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive mb-4">Error: {error}</div>
        <Button onClick={fetchAdminStats}>Retry</Button>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive mb-4">You do not have permission to access this page.</div>
        <Button onClick={() => navigate('/')}>Return to Home</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - PhysioAI</title>
        <meta
          name="description"
          content="Admin dashboard for PhysioAI platform management"
        />
      </Helmet>

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                  <CardDescription>Summary of registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center items-center h-64">
                    <div className="stats-container grid grid-cols-2 gap-4 w-full">
                      <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <Users className="h-8 w-8 text-primary mb-2" />
                        <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Users</div>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <User className="h-8 w-8 text-primary mb-2" />
                        <div className="text-3xl font-bold">{stats?.byMembership.premium || 0}</div>
                        <div className="text-sm text-muted-foreground">Premium Members</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Membership Distribution</CardTitle>
                  <CardDescription>User membership tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareMembershipChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {prepareMembershipChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>All registered users ({stats?.users.length || 0})</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of all registered users on the platform.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.fullName || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.membershipTier === 'premium'
                                ? 'bg-purple-100 text-purple-800'
                                : user.membershipTier === 'standard'
                                ? 'bg-blue-100 text-blue-800'
                                : user.membershipTier === 'basic'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.membershipTier.charAt(0).toUpperCase() + user.membershipTier.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{user.membershipExpiry || '-'}</TableCell>
                        <TableCell>{user.createdAt !== 'N/A' ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminDashboard;
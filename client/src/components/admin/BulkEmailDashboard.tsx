import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, TrendingUp, Calendar, Send, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailCampaign {
  id: number;
  title: string;
  subject: string;
  targetAudience: string;
  status: string;
  recipientCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: string;
  sentAt?: string;
}

interface CampaignStats {
  campaign: EmailCampaign;
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    successRate: number;
  };
}

export default function BulkEmailDashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    targetAudience: 'competition_subscribers'
  });

  const queryClient = useQueryClient();

  // Get all email campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/admin/email-campaigns'],
    enabled: true
  });

  // Send Pattern Recognition announcement mutation
  const sendAnnouncementMutation = useMutation({
    mutationFn: (targetAudience: string) => 
      apiRequest('/api/admin/send-pattern-recognition-announcement', 'POST', { targetAudience }),
    onSuccess: (data) => {
      toast({
        title: "Announcement Sent!",
        description: `Pattern Recognition announcement sent to ${data.recipientCount} users`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send announcement",
        variant: "destructive"
      });
    }
  });

  // Create custom campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: (campaignData: any) => 
      apiRequest('/api/admin/create-email-campaign', 'POST', campaignData),
    onSuccess: (data) => {
      toast({
        title: "Campaign Created!",
        description: `Email campaign sent to ${data.recipientCount} users`
      });
      setShowCreateForm(false);
      setFormData({
        title: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        targetAudience: 'competition_subscribers'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive"
      });
    }
  });

  const handleSendAnnouncement = (targetAudience: string) => {
    sendAnnouncementMutation.mutate(targetAudience);
  };

  const handleCreateCampaign = () => {
    if (!formData.title || !formData.subject || !formData.htmlContent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createCampaignMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary', color: 'bg-gray-500' },
      sending: { variant: 'default', color: 'bg-blue-500' },
      sent: { variant: 'default', color: 'bg-green-500' },
      failed: { variant: 'destructive', color: 'bg-red-500' },
      scheduled: { variant: 'outline', color: 'bg-orange-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge variant={config.variant as any} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Email Management</h1>
          <p className="text-gray-600">Send Pattern Recognition announcements and manage email campaigns</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Pattern Recognition Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Send announcement to all competition subscribers about new Pattern Recognition challenges
            </p>
            <Button
              onClick={() => handleSendAnnouncement('competition_subscribers')}
              disabled={sendAnnouncementMutation.isPending}
              className="w-full"
            >
              {sendAnnouncementMutation.isPending ? 'Sending...' : 'Send to Competitors'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              All Members Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Send Pattern Recognition announcement to all registered users
            </p>
            <Button
              onClick={() => handleSendAnnouncement('all')}
              disabled={sendAnnouncementMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {sendAnnouncementMutation.isPending ? 'Sending...' : 'Send to All Users'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Campaign Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Campaigns:</span>
                <span className="font-semibold">{campaigns?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Campaigns:</span>
                <span className="font-semibold">
                  {campaigns?.filter(c => c.status === 'sent').length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Create Email Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekly Challenge Announcement"
                />
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="competition_subscribers">Competition Subscribers</SelectItem>
                    <SelectItem value="premium_users">Premium Users</SelectItem>
                    <SelectItem value="pattern_recognition_players">Pattern Recognition Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="🎯 New Challenge Available - Test Your Skills!"
              />
            </div>

            <div>
              <Label htmlFor="htmlContent">HTML Content</Label>
              <Textarea
                id="htmlContent"
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                placeholder="Enter HTML email content..."
                rows={10}
              />
            </div>

            <div>
              <Label htmlFor="textContent">Text Content (Fallback)</Label>
              <Textarea
                id="textContent"
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Plain text version of the email..."
                rows={6}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
                className="flex-1"
              >
                {createCampaignMutation.isPending ? 'Creating...' : 'Create & Send Campaign'}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Campaign History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{campaign.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Target: {campaign.targetAudience.replace('_', ' ')}</span>
                      <span>Recipients: {campaign.recipientCount}</span>
                      {campaign.openedCount > 0 && (
                        <span>Opened: {campaign.openedCount}</span>
                      )}
                      <span>
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {campaign.recipientCount} recipients
                    </div>
                    {campaign.sentAt && (
                      <div className="text-xs text-gray-500">
                        Sent: {new Date(campaign.sentAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No email campaigns yet. Create your first campaign above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
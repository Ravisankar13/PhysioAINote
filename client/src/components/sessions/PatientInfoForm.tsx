import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define the validation schema
const patientInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  pastSurgicalHistory: z.string().optional(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  bodyPart: z.string().min(1, 'Body part is required'),
});

type PatientInfoFormValues = z.infer<typeof patientInfoSchema>;

interface PatientInfoFormProps {
  defaultValues?: Partial<PatientInfoFormValues>;
  onSubmit: (data: PatientInfoFormValues) => void;
  isLoading?: boolean;
}

const PatientInfoForm: React.FC<PatientInfoFormProps> = ({
  defaultValues,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<PatientInfoFormValues>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dob: '',
      gender: '',
      pastMedicalHistory: '',
      pastSurgicalHistory: '',
      chiefComplaint: '',
      bodyPart: '',
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint*</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the main problem"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bodyPart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Part*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select body part" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="elbow">Elbow</SelectItem>
                      <SelectItem value="wrist">Wrist</SelectItem>
                      <SelectItem value="hand">Hand</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="foot">Foot</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pastMedicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Medical History</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Relevant medical history"
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pastSurgicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Surgical History</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Relevant surgical history"
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Patient Information'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PatientInfoForm;
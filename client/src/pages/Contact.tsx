import { useState } from "react";
import { Helmet } from "react-helmet";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MailOutline, Phone, LocationOn } from "@/components/ui/icon";

const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    console.log("Form submitted:", data);
    
    toast({
      title: "Message Sent",
      description: "Thank you for your message. We'll get back to you soon.",
    });
    
    form.reset();
    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | PhysioAI</title>
        <meta
          name="description"
          content="Get in touch with PhysioAI for questions about our AI-powered clinical notes generator or physiotherapy services."
        />
        <meta property="og:title" content="Contact Us | PhysioAI" />
        <meta
          property="og:description"
          content="Get in touch with PhysioAI for questions about our services."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-serif font-bold text-neutral-900 sm:text-4xl">
              Contact Us
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-neutral-500 sm:mt-4">
              Get in touch with our team for any questions or inquiries
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 mb-12">
            <Card className="bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <Phone className="text-primary-600 h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Phone</h3>
                <p className="text-neutral-600">+1 (555) 123-4567</p>
                <p className="text-neutral-500 text-sm mt-1">Monday-Friday, 9am-5pm</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <MailOutline className="text-primary-600 h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Email</h3>
                <p className="text-neutral-600">contact@physioai.com</p>
                <p className="text-neutral-500 text-sm mt-1">We'll respond as soon as possible</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <LocationOn className="text-primary-600 h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Office</h3>
                <p className="text-neutral-600">123 Therapy Lane</p>
                <p className="text-neutral-500 text-sm mt-1">New York, NY 10001</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Send us a message</h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="How can we help you?"
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Please provide as much detail as possible about your inquiry.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default Contact;

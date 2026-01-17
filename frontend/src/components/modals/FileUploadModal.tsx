import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/FileUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { UploadEmployeeSchema } from "@/modules/employee/schema";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onSubmit: (data: z.infer<typeof UploadEmployeeSchema>) => void;
  isLoading: boolean;
}

export const FileUploadModal = ({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  isLoading,
}: FileUploadModalProps) => {
  function onChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  const form = useForm<z.infer<typeof UploadEmployeeSchema>>({
    resolver: zodResolver(UploadEmployeeSchema),
    defaultValues: {
      files: [],
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="files"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pièces jointes</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onValueChange={field.onChange}
                      maxSize={100 * 1024 * 1024}
                      onFileReject={(_, message) => {
                        form.setError("files", {
                          message,
                        });
                      }}
                      multiple
                    >
                      <FileUploadDropzone className="flex-row border-dotted">
                        <CloudUpload className="size-4" />
                        Glisser-déposer ou
                        <FileUploadTrigger asChild>
                          <Button variant="link" size="sm" className="p-0">
                            sélectionner les fichiers
                          </Button>
                        </FileUploadTrigger>
                        à importer
                      </FileUploadDropzone>
                      <FileUploadList>
                        {field.value.map((file, index) => (
                          <FileUploadItem key={index} value={file}>
                            <FileUploadItemPreview />
                            <FileUploadItemMetadata />
                            <FileUploadItemDelete asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                              >
                                <X />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </FileUploadItemDelete>
                          </FileUploadItem>
                        ))}
                      </FileUploadList>
                    </FileUpload>
                  </FormControl>
                  <FormDescription>
                    Importer des fichiers d'une taille maximale de 100 Mo
                    chacun.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-6 space-x-2 flex items-center justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#687818] text-white"
              >
                Importer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

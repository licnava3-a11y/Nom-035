import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Loader2, FileSignature, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LegalRepresentatives() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [firmaFile, setFirmaFile] = useState<File | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);

  // Queries
  const { data: representatives, isLoading, refetch } = trpc.company.legalRepresentative.list.useQuery();

  // Mutations
  const createRepresentative = trpc.company.legalRepresentative.create.useMutation({
    onSuccess: () => {
      toast.success('Representante legal agregado correctamente');
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateRepresentative = trpc.company.legalRepresentative.update.useMutation({
    onSuccess: () => {
      toast.success('Representante actualizado correctamente');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteRepresentative = trpc.company.legalRepresentative.delete.useMutation({
    onSuccess: () => {
      toast.success('Representante eliminado correctamente');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    cargo: '',
    email: '',
    telefono: '',
    rfc: '',
    curp: '',
    domicilio: '',
    actaConstitutiva: '',
    poderNotarial: '',
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      cargo: '',
      email: '',
      telefono: '',
      rfc: '',
      curp: '',
      domicilio: '',
      actaConstitutiva: '',
      poderNotarial: '',
    });
    setFirmaFile(null);
    setFirmaPreview(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('El archivo no debe exceder 2MB');
        return;
      }

      setFirmaFile(file);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFirmaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convertir firma a base64 si existe
    let firmaData: string | undefined;
    if (firmaFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        firmaData = reader.result as string;
        await createRepresentative.mutateAsync({
          ...formData,
          firmaData,
        });
      };
      reader.readAsDataURL(firmaFile);
    } else {
      await createRepresentative.mutateAsync(formData);
    }
  };

  const handleToggleActive = (id: number, nombre: string, cargo: string, email: string | null, telefono: string | null, activo: boolean) => {
    updateRepresentative.mutate({
      id,
      nombre,
      cargo,
      email: email || undefined,
      telefono: telefono || undefined,
      activo: !activo,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este representante legal?')) {
      deleteRepresentative.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Representantes Legales
            </CardTitle>
            <CardDescription>
              Gestiona las personas autorizadas para firmar documentos oficiales
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Representante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Representante Legal</DialogTitle>
                <DialogDescription>
                  Agrega una persona autorizada para firmar documentos oficiales
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">
                      Nombre Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      placeholder="Nombre completo del representante"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo">
                      Cargo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cargo"
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Director General, Gerente"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="correo@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="(55) 1234-5678"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rfc">RFC</Label>
                    <Input
                      id="rfc"
                      name="rfc"
                      value={formData.rfc}
                      onChange={handleInputChange}
                      placeholder="ABCD123456XYZ"
                      maxLength={13}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curp">CURP</Label>
                    <Input
                      id="curp"
                      name="curp"
                      value={formData.curp}
                      onChange={handleInputChange}
                      placeholder="18 caracteres"
                      maxLength={18}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input
                    id="domicilio"
                    name="domicilio"
                    value={formData.domicilio}
                    onChange={handleInputChange}
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="actaConstitutiva">Acta Constitutiva</Label>
                    <Input
                      id="actaConstitutiva"
                      name="actaConstitutiva"
                      value={formData.actaConstitutiva}
                      onChange={handleInputChange}
                      placeholder="Número de acta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poderNotarial">Poder Notarial</Label>
                    <Input
                      id="poderNotarial"
                      name="poderNotarial"
                      value={formData.poderNotarial}
                      onChange={handleInputChange}
                      placeholder="Número de poder"
                    />
                  </div>
                </div>

                {/* Firma digitalizada */}
                <div className="space-y-2">
                  <Label htmlFor="firma">Firma Digitalizada</Label>
                  <Input
                    id="firma"
                    type="file"
                    accept="image/*"
                    onChange={handleFirmaChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Imagen de la firma autógrafa (PNG, JPG). Máximo 2MB
                  </p>
                </div>

                {/* Preview de firma */}
                {firmaPreview && (
                  <div className="space-y-2">
                    <Label>Vista Previa de Firma</Label>
                    <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                      <img 
                        src={firmaPreview} 
                        alt="Preview firma" 
                        className="max-h-24 object-contain"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRepresentative.isPending}
                  >
                    {createRepresentative.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {representatives && representatives.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {representatives.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">{rep.nombre}</TableCell>
                  <TableCell>{rep.cargo}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {rep.email && <div>{rep.email}</div>}
                      {rep.telefono && <div className="text-muted-foreground">{rep.telefono}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rep.firmaUrl ? (
                      <img 
                        src={rep.firmaUrl} 
                        alt="Firma" 
                        className="h-8 object-contain"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin firma</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rep.activo ? "default" : "secondary"}>
                      {rep.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(
                          rep.id,
                          rep.nombre,
                          rep.cargo,
                          rep.email,
                          rep.telefono,
                          rep.activo
                        )}
                        disabled={updateRepresentative.isPending}
                      >
                        {rep.activo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(rep.id)}
                        disabled={deleteRepresentative.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay representantes legales registrados</p>
            <p className="text-sm">Agrega el primer representante legal de tu empresa</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

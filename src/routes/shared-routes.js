const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticate: authenticateToken } = require("../middleware/auth");

// ═══ GET /shared-routes — Liste publique (tous les trajets actifs) ═══
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { departureCity, arrivalCity, vehicleType, dateFrom, dateTo, limit = "50" } = req.query;
    const where = { status: "ACTIVE", departureDate: { gte: new Date() } };

    if (departureCity) where.departureCity = { contains: departureCity, mode: "insensitive" };
    if (arrivalCity) where.arrivalCity = { contains: arrivalCity, mode: "insensitive" };
    if (vehicleType) where.vehicleType = vehicleType;
    if (dateFrom) where.departureDate = { ...where.departureDate, gte: new Date(dateFrom) };
    if (dateTo) where.departureDate = { ...where.departureDate, lte: new Date(dateTo) };

    const routes = await prisma.sharedRoute.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, company: { select: { id: true, name: true, isVerified: true } } } },
      },
      orderBy: { departureDate: "asc" },
      take: parseInt(limit),
    });

    res.json({ routes, total: routes.length });
  } catch (error) {
    console.error("GET /shared-routes error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══ GET /shared-routes/mine — Mes trajets partagés ═══
router.get("/mine", authenticateToken, async (req, res) => {
  try {
    const routes = await prisma.sharedRoute.findMany({
      where: { userId: req.user.id },
      orderBy: { departureDate: "desc" },
    });
    res.json({ routes });
  } catch (error) {
    console.error("GET /shared-routes/mine error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══ POST /shared-routes — Créer un trajet partagé (transporteur) ═══
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "TRANSPORTEUR" && !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Seuls les transporteurs peuvent publier des trajets" });
    }

    const {
      departureAddress, departureCity, departurePostalCode, departureLat, departureLon,
      arrivalAddress, arrivalCity, arrivalPostalCode, arrivalLat, arrivalLon,
      departureDate, vehicleType, availableWeightKg, availablePallets, availableVolumeM3, notes
    } = req.body;

    if (!departureCity || !arrivalCity || !departureDate) {
      return res.status(400).json({ error: "Ville départ, ville arrivée et date obligatoires" });
    }

    const route = await prisma.sharedRoute.create({
      data: {
        userId: req.user.id,
        companyId: req.user.companyId || null,
        departureAddress, departureCity, departurePostalCode,
        departureLat: departureLat ? parseFloat(departureLat) : null,
        departureLon: departureLon ? parseFloat(departureLon) : null,
        arrivalAddress, arrivalCity, arrivalPostalCode,
        arrivalLat: arrivalLat ? parseFloat(arrivalLat) : null,
        arrivalLon: arrivalLon ? parseFloat(arrivalLon) : null,
        departureDate: new Date(departureDate),
        vehicleType: vehicleType || null,
        availableWeightKg: availableWeightKg ? parseFloat(availableWeightKg) : null,
        availablePallets: availablePallets ? parseInt(availablePallets) : null,
        availableVolumeM3: availableVolumeM3 ? parseFloat(availableVolumeM3) : null,
        notes: notes || null,
        expiresAt: new Date(departureDate),
      },
    });

    res.status(201).json({ route, message: "Trajet publié avec succès" });
  } catch (error) {
    console.error("POST /shared-routes error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══ PUT /shared-routes/:id — Modifier un trajet ═══
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const route = await prisma.sharedRoute.findUnique({ where: { id: req.params.id } });
    if (!route) return res.status(404).json({ error: "Trajet non trouvé" });
    if (route.userId !== req.user.id && !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const {
      departureAddress, departureCity, departurePostalCode,
      arrivalAddress, arrivalCity, arrivalPostalCode,
      departureDate, vehicleType, availableWeightKg, availablePallets, notes, status
    } = req.body;

    const updated = await prisma.sharedRoute.update({
      where: { id: req.params.id },
      data: {
        ...(departureAddress !== undefined && { departureAddress }),
        ...(departureCity !== undefined && { departureCity }),
        ...(departurePostalCode !== undefined && { departurePostalCode }),
        ...(arrivalAddress !== undefined && { arrivalAddress }),
        ...(arrivalCity !== undefined && { arrivalCity }),
        ...(arrivalPostalCode !== undefined && { arrivalPostalCode }),
        ...(departureDate !== undefined && { departureDate: new Date(departureDate) }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(availableWeightKg !== undefined && { availableWeightKg: parseFloat(availableWeightKg) || null }),
        ...(availablePallets !== undefined && { availablePallets: parseInt(availablePallets) || null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ route: updated, message: "Trajet mis à jour" });
  } catch (error) {
    console.error("PUT /shared-routes/:id error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══ DELETE /shared-routes/:id — Supprimer un trajet ═══
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const route = await prisma.sharedRoute.findUnique({ where: { id: req.params.id } });
    if (!route) return res.status(404).json({ error: "Trajet non trouvé" });
    if (route.userId !== req.user.id && !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await prisma.sharedRoute.delete({ where: { id: req.params.id } });
    res.json({ message: "Trajet supprimé" });
  } catch (error) {
    console.error("DELETE /shared-routes/:id error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

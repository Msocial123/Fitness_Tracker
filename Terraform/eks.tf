module "eks" {
  source  = "terraform-aws-modules/eks/aws"

  cluster_name    = var.cluster_name
  cluster_version = "1.31"

  subnet_ids = module.vpc.private_subnets

  vpc_id = module.vpc.vpc_id

  eks_managed_node_groups = {
    workers = {
      desired_size = 2
      min_size     = 2
      max_size     = 3

      instance_types = ["t3.small"]
    }
  }
}